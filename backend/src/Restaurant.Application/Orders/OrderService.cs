using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Common.Settings;
using Restaurant.Application.Menu;
using Restaurant.Application.Orders.Dtos;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;
using Restaurant.Domain.Orders;

namespace Restaurant.Application.Orders;

public class OrderService(
    IApplicationDbContext db,
    IMenuService menuService,
    ICurrentUser currentUser,
    IClock clock,
    IOrderNotifier notifier,
    IOptions<RestaurantOptions> options) : IOrderService
{
    private readonly RestaurantOptions _options = options.Value;

    public async Task<CartPreviewDto> PreviewAsync(CartPreviewRequest request, CancellationToken ct = default)
    {
        var lines = await ResolveLinesAsync(request.Items, ct);

        var subtotal = lines.Where(l => l.IsAvailable).Sum(l => l.LineTotal);
        var totals = OrderPricing.Calculate(subtotal, request.Type, _options);
        var canCheckout = lines.Count > 0 && lines.All(l => l.IsAvailable);

        return new CartPreviewDto(
            lines,
            totals.Subtotal,
            totals.TaxAmount,
            totals.DeliveryFee,
            totals.Total,
            canCheckout);
    }

    public async Task<OrderDto> PlaceAsync(PlaceOrderRequest request, CancellationToken ct = default)
    {
        var customerId = currentUser.RequireUserId();
        ValidateFulfilmentDetails(request);

        var requestedItems = NormalizeRequestedItems(request.Items);
        var today = clock.Today;

        await using var transaction = await db.BeginTransactionAsync(ct);

        var sellable = await menuService.GetSellableAsync(
            today, requestedItems.Select(i => i.MenuItemId).ToList(), ct);

        // Load the schedule rows we are about to decrement, tracked, so the sold counter is
        // written under the optimistic-concurrency check on DailyMenuItem.RowVersion.
        var dailyIds = sellable.Values
            .Where(s => s.DailyMenuItemId is not null)
            .Select(s => s.DailyMenuItemId!.Value)
            .ToList();

        var dailyEntries = await db.DailyMenuItems
            .Where(d => dailyIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, ct);

        var order = new Order
        {
            CustomerId = customerId,
            OrderNumber = string.Empty, // assigned from the identity value once the row exists
            Status = OrderStatus.New,
            Type = request.Type,
            TableNumber = Trimmed(request.TableNumber),
            DeliveryAddress = Trimmed(request.DeliveryAddress),
            ContactPhone = Trimmed(request.ContactPhone),
            Notes = Trimmed(request.Notes),
            PlacedAt = clock.UtcNow
        };

        decimal subtotal = 0;

        foreach (var requested in requestedItems)
        {
            if (!sellable.TryGetValue(requested.MenuItemId, out var dish))
                throw new BusinessRuleException(
                    "One of the dishes in your cart is no longer on today's menu. Please review your cart.");

            if (dish.IsSoldOut)
                throw new BusinessRuleException($"'{dish.Name}' has sold out for today.");

            if (dish.RemainingQuantity is { } remaining && requested.Quantity > remaining)
                throw new BusinessRuleException(
                    remaining == 0
                        ? $"'{dish.Name}' has sold out for today."
                        : $"Only {remaining} portion(s) of '{dish.Name}' are left today.");

            var lineTotal = OrderPricing.Round(dish.Price * requested.Quantity);
            subtotal += lineTotal;

            order.Items.Add(new OrderItem
            {
                MenuItemId = dish.MenuItemId,
                ItemName = dish.Name,
                UnitPrice = dish.Price,
                Quantity = requested.Quantity,
                LineTotal = lineTotal,
                Notes = requested.Notes
            });

            if (dish.DailyMenuItemId is { } dailyId && dailyEntries.TryGetValue(dailyId, out var daily))
                daily.QuantitySold += requested.Quantity;
        }

        var totals = OrderPricing.Calculate(subtotal, request.Type, _options);
        order.Subtotal = totals.Subtotal;
        order.TaxAmount = totals.TaxAmount;
        order.DeliveryFee = totals.DeliveryFee;
        order.TotalAmount = totals.Total;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            FromStatus = null,
            ToStatus = OrderStatus.New,
            ChangedByUserId = customerId,
            ChangedAt = clock.UtcNow,
            Note = "Order placed"
        });

        db.Orders.Add(order);

        try
        {
            await db.SaveChangesAsync(ct);

            order.OrderNumber = BuildOrderNumber(order.PlacedAt, order.Id);
            await db.SaveChangesAsync(ct);

            await db.CommitTransactionAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another customer took the last portion between our availability check and the write.
            throw new ConflictException(
                "Someone just ordered the last portion of one of your dishes. Please review your cart and try again.");
        }

        var dto = await LoadOrderAsync(order.Id, ct);
        await notifier.OrderPlacedAsync(dto, ct);

        return dto;
    }

    public async Task<PagedResult<OrderSummaryDto>> SearchAsync(OrderQuery query, CancellationToken ct = default) =>
        await BuildOrderQuery(query, customerId: null).ToPagedResultAsync(query.Page, query.PageSize, ct);

    public async Task<PagedResult<OrderSummaryDto>> SearchMineAsync(OrderQuery query, CancellationToken ct = default) =>
        await BuildOrderQuery(query, currentUser.RequireUserId()).ToPagedResultAsync(query.Page, query.PageSize, ct);

    public async Task<OrderDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var dto = await LoadOrderAsync(id, ct);

        // Customers are scoped to their own orders; an id from another account reads as "not found"
        // rather than "forbidden", so ids cannot be probed.
        if (currentUser.Role == UserRole.Customer && dto.CustomerId != currentUser.UserId)
            throw NotFoundException.For("Order", id);

        return dto;
    }

    public async Task<OrderDto> UpdateStatusAsync(
        int id, UpdateOrderStatusRequest request, CancellationToken ct = default)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw NotFoundException.For("Order", id);

        if (!OrderStatusTransitions.CanTransition(order.Status, request.Status))
        {
            var allowed = OrderStatusTransitions.NextStatuses(order.Status);
            throw new BusinessRuleException(
                allowed.Count == 0
                    ? $"Order {order.OrderNumber} is {order.Status} and can no longer change."
                    : $"Order {order.OrderNumber} cannot go from {order.Status} to {request.Status}. " +
                      $"Allowed: {string.Join(", ", allowed)}.");
        }

        await ApplyStatusAsync(order, request.Status, request.Note, ct);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                $"Order {order.OrderNumber} was updated by someone else. Refresh and try again.");
        }

        var dto = await LoadOrderAsync(order.Id, ct);
        await notifier.OrderStatusChangedAsync(dto, ct);

        return dto;
    }

    public async Task<OrderDto> CancelMyOrderAsync(
        int id, CancelOrderRequest request, CancellationToken ct = default)
    {
        var customerId = currentUser.RequireUserId();

        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.CustomerId == customerId, ct)
            ?? throw NotFoundException.For("Order", id);

        // Once the kitchen starts cooking, cancelling is a staff decision, not a self-service one.
        if (order.Status != OrderStatus.New)
            throw new BusinessRuleException(
                "This order is already being prepared and can no longer be cancelled online. Please call the restaurant.");

        await ApplyStatusAsync(order, OrderStatus.Cancelled, request.Reason, ct);
        await db.SaveChangesAsync(ct);

        var dto = await LoadOrderAsync(order.Id, ct);
        await notifier.OrderStatusChangedAsync(dto, ct);

        return dto;
    }

    /// <summary>
    /// Applies a transition: stamps the lifecycle timestamp, appends history and, when an order
    /// is cancelled, returns its portions to the day's stock.
    /// </summary>
    private async Task ApplyStatusAsync(Order order, OrderStatus next, string? note, CancellationToken ct)
    {
        var previous = order.Status;
        var now = clock.UtcNow;

        order.Status = next;

        switch (next)
        {
            case OrderStatus.Preparing:
                order.PreparingAt = now;
                break;
            case OrderStatus.Ready:
                order.ReadyAt = now;
                break;
            case OrderStatus.Completed:
                order.CompletedAt = now;
                break;
            case OrderStatus.Cancelled:
                order.CancelledAt = now;
                order.CancellationReason = Trimmed(note);
                await ReleaseReservedPortionsAsync(order, ct);
                break;
        }

        order.StatusHistory.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            FromStatus = previous,
            ToStatus = next,
            ChangedByUserId = currentUser.UserId,
            ChangedAt = now,
            Note = Trimmed(note)
        });
    }

    /// <summary>Puts cancelled portions back on the day's menu so they can be sold again.</summary>
    private async Task ReleaseReservedPortionsAsync(Order order, CancellationToken ct)
    {
        var orderDate = DateOnly.FromDateTime(order.PlacedAt);
        var menuItemIds = order.Items.Select(i => i.MenuItemId).ToList();

        var dailyEntries = await db.DailyMenuItems
            .Where(d => d.MenuDate == orderDate && menuItemIds.Contains(d.MenuItemId))
            .ToListAsync(ct);

        foreach (var entry in dailyEntries)
        {
            var quantity = order.Items
                .Where(i => i.MenuItemId == entry.MenuItemId)
                .Sum(i => i.Quantity);

            entry.QuantitySold = Math.Max(0, entry.QuantitySold - quantity);
        }
    }

    private IQueryable<OrderSummaryDto> BuildOrderQuery(OrderQuery query, int? customerId)
    {
        var orders = db.Orders.AsNoTracking();

        if (customerId is { } id)
            orders = orders.Where(o => o.CustomerId == id);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            orders = orders.Where(o =>
                EF.Functions.Like(o.OrderNumber, $"%{term}%") ||
                EF.Functions.Like(o.Customer.FullName, $"%{term}%") ||
                EF.Functions.Like(o.Customer.Email, $"%{term}%"));
        }

        if (query.Status is { } status)
            orders = orders.Where(o => o.Status == status);

        if (query.Type is { } type)
            orders = orders.Where(o => o.Type == type);

        if (query.ActiveOnly)
            orders = orders.Where(o =>
                o.Status == OrderStatus.New || o.Status == OrderStatus.Preparing || o.Status == OrderStatus.Ready);

        if (query.FromDate is { } from)
        {
            var fromUtc = from.ToDateTime(TimeOnly.MinValue);
            orders = orders.Where(o => o.PlacedAt >= fromUtc);
        }

        if (query.ToDate is { } to)
        {
            var toUtc = to.AddDays(1).ToDateTime(TimeOnly.MinValue);
            orders = orders.Where(o => o.PlacedAt < toUtc);
        }

        orders = (query.SortBy?.ToLowerInvariant()) switch
        {
            "total" => query.SortDescending
                ? orders.OrderByDescending(o => o.TotalAmount)
                : orders.OrderBy(o => o.TotalAmount),
            "status" => query.SortDescending
                ? orders.OrderByDescending(o => o.Status).ThenByDescending(o => o.PlacedAt)
                : orders.OrderBy(o => o.Status).ThenByDescending(o => o.PlacedAt),
            // The kitchen works oldest-first; every other view wants newest-first.
            "oldest" => orders.OrderBy(o => o.PlacedAt),
            _ => query.SortDescending ? orders.OrderBy(o => o.PlacedAt) : orders.OrderByDescending(o => o.PlacedAt)
        };

        return orders.Select(o => new OrderSummaryDto(
            o.Id,
            o.OrderNumber,
            o.Customer.FullName,
            o.Status,
            o.Type,
            o.TableNumber,
            o.TotalAmount,
            o.Items.Sum(i => i.Quantity),
            o.PlacedAt));
    }

    private async Task<OrderDto> LoadOrderAsync(int id, CancellationToken ct)
    {
        var dto = await db.Orders
            .AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new OrderDto(
                o.Id,
                o.OrderNumber,
                o.CustomerId,
                o.Customer.FullName,
                o.Customer.Email,
                o.Status,
                o.Type,
                o.TableNumber,
                o.DeliveryAddress,
                o.ContactPhone,
                o.Notes,
                o.Subtotal,
                o.TaxAmount,
                o.DeliveryFee,
                o.TotalAmount,
                o.Items.Sum(i => i.Quantity),
                o.PlacedAt,
                o.PreparingAt,
                o.ReadyAt,
                o.CompletedAt,
                o.CancelledAt,
                o.CancellationReason,
                new List<OrderStatus>(),
                o.Items.OrderBy(i => i.Id).Select(i => new OrderItemDto(
                    i.Id,
                    i.MenuItemId,
                    i.ItemName,
                    i.MenuItem.ImageUrl,
                    i.UnitPrice,
                    i.Quantity,
                    i.LineTotal,
                    i.Notes)).ToList(),
                o.StatusHistory.OrderBy(h => h.ChangedAt).Select(h => new OrderStatusHistoryDto(
                    h.FromStatus,
                    h.ToStatus,
                    h.ChangedByUser != null ? h.ChangedByUser.FullName : null,
                    h.ChangedAt,
                    h.Note)).ToList()))
            .FirstOrDefaultAsync(ct)
            ?? throw NotFoundException.For("Order", id);

        // Computed after projection so the UI can render exactly the buttons this order allows.
        return dto with { AllowedNextStatuses = OrderStatusTransitions.NextStatuses(dto.Status).ToList() };
    }

    /// <summary>Merges duplicate lines and rejects carts that break the configured limits.</summary>
    private List<PlaceOrderItemRequest> NormalizeRequestedItems(IReadOnlyList<PlaceOrderItemRequest> items)
    {
        if (items.Count == 0)
            throw new BusinessRuleException("Your cart is empty.");

        var merged = items
            .GroupBy(i => i.MenuItemId)
            .Select(g => new PlaceOrderItemRequest(
                g.Key,
                g.Sum(i => i.Quantity),
                string.Join(" | ", g.Select(i => i.Notes).Where(n => !string.IsNullOrWhiteSpace(n)))))
            .Select(i => i with { Notes = string.IsNullOrWhiteSpace(i.Notes) ? null : i.Notes })
            .ToList();

        foreach (var item in merged)
        {
            if (item.Quantity < 1)
                throw new BusinessRuleException("Quantities must be at least 1.");

            if (item.Quantity > _options.MaxQuantityPerItem)
                throw new BusinessRuleException(
                    $"You can order at most {_options.MaxQuantityPerItem} of the same dish. Please call us for larger orders.");
        }

        if (merged.Sum(i => i.Quantity) > _options.MaxItemsPerOrder)
            throw new BusinessRuleException(
                $"An order can contain at most {_options.MaxItemsPerOrder} items. Please call us for larger orders.");

        return merged;
    }

    private async Task<List<CartPreviewLineDto>> ResolveLinesAsync(
        IReadOnlyList<PlaceOrderItemRequest> items, CancellationToken ct)
    {
        if (items.Count == 0)
            return [];

        var ids = items.Select(i => i.MenuItemId).Distinct().ToList();
        var sellable = await menuService.GetSellableAsync(clock.Today, ids, ct);

        // Names are looked up separately so an unavailable dish can still be named in the error.
        var names = await db.MenuItems
            .AsNoTracking()
            .Where(m => ids.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.Name, ct);

        return items.Select(item =>
        {
            var name = names.GetValueOrDefault(item.MenuItemId, "Unknown dish");

            if (!sellable.TryGetValue(item.MenuItemId, out var dish))
                return new CartPreviewLineDto(item.MenuItemId, name, 0, item.Quantity, 0, false,
                    "Not on today's menu");

            if (dish.IsSoldOut || dish.RemainingQuantity == 0)
                return new CartPreviewLineDto(item.MenuItemId, dish.Name, dish.Price, item.Quantity, 0, false,
                    "Sold out for today");

            if (dish.RemainingQuantity is { } remaining && item.Quantity > remaining)
                return new CartPreviewLineDto(item.MenuItemId, dish.Name, dish.Price, item.Quantity, 0, false,
                    $"Only {remaining} left today");

            var lineTotal = OrderPricing.Round(dish.Price * item.Quantity);
            return new CartPreviewLineDto(item.MenuItemId, dish.Name, dish.Price, item.Quantity, lineTotal, true, null);
        }).ToList();
    }

    private static void ValidateFulfilmentDetails(PlaceOrderRequest request)
    {
        switch (request.Type)
        {
            case OrderType.DineIn when string.IsNullOrWhiteSpace(request.TableNumber):
                throw new ValidationException(nameof(request.TableNumber), "A table number is required for dine-in orders.");
            case OrderType.Delivery when string.IsNullOrWhiteSpace(request.DeliveryAddress):
                throw new ValidationException(nameof(request.DeliveryAddress), "A delivery address is required.");
            case OrderType.Delivery when string.IsNullOrWhiteSpace(request.ContactPhone):
                throw new ValidationException(nameof(request.ContactPhone), "A contact phone number is required for delivery.");
        }
    }

    private static string BuildOrderNumber(DateTime placedAt, int orderId) =>
        $"ORD-{placedAt:yyyyMMdd}-{orderId:D5}";

    private static string? Trimmed(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
