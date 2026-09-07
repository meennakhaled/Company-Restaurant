using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Settings;
using Restaurant.Application.Orders;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;
using Microsoft.Extensions.Options;

namespace Restaurant.Infrastructure.Persistence.Seed;

/// <summary>
/// Brings a fresh database up to a state you can actually demo: staff accounts, a full
/// catalogue, two weeks of daily menus and enough order history for the dashboard charts
/// to show real trends. Every step is idempotent, so it is safe to run on every startup.
/// </summary>
public class DatabaseSeeder(
    RestaurantDbContext db,
    IPasswordHasher passwordHasher,
    IClock clock,
    IOptions<RestaurantOptions> options,
    ILogger<DatabaseSeeder> logger)
{
    private readonly RestaurantOptions _options = options.Value;

    // Fixed so the demo data is reproducible between runs and between machines.
    private readonly Random _random = new(20260813);

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedUsersAsync(ct);
        await SeedCategoriesAsync(ct);
        await SeedMenuItemsAsync(ct);
        await SeedDailyMenusAsync(ct);
        await SeedOrderHistoryAsync(ct);
    }

    private async Task SeedUsersAsync(CancellationToken ct)
    {
        if (await db.Users.AnyAsync(ct))
            return;

        logger.LogInformation("Seeding demo accounts");

        // Demo credentials, documented in the README. In a real deployment the first admin
        // would be created through a one-off provisioning step, not committed to the repo.
        var users = new[]
        {
            CreateUser("Restaurant Manager", "admin@restaurant.com", "Admin@123", UserRole.Admin, "+1 555 0100"),
            CreateUser("Chef Marco", "chef@restaurant.com", "Chef@1234", UserRole.Staff, "+1 555 0101"),
            CreateUser("Sofia Rossi", "staff@restaurant.com", "Staff@123", UserRole.Staff, "+1 555 0102"),
            CreateUser("Emma Carter", "customer@restaurant.com", "Customer@123", UserRole.Customer, "+1 555 0200"),
            CreateUser("James Wilson", "james@example.com", "Customer@123", UserRole.Customer, "+1 555 0201"),
            CreateUser("Aisha Khan", "aisha@example.com", "Customer@123", UserRole.Customer, "+1 555 0202"),
            CreateUser("Daniel Meyer", "daniel@example.com", "Customer@123", UserRole.Customer, "+1 555 0203")
        };

        db.Users.AddRange(users);
        await db.SaveChangesAsync(ct);
    }

    private User CreateUser(string name, string email, string password, UserRole role, string phone) => new()
    {
        FullName = name,
        Email = email,
        PasswordHash = passwordHasher.Hash(password),
        PhoneNumber = phone,
        Role = role,
        IsActive = true
    };

    private async Task SeedCategoriesAsync(CancellationToken ct)
    {
        if (await db.Categories.AnyAsync(ct))
            return;

        logger.LogInformation("Seeding menu categories");

        db.Categories.AddRange(SeedData.Categories.Select(c => new Category
        {
            Name = c.Name,
            Slug = c.Name.ToLowerInvariant().Replace(" & ", "-").Replace(' ', '-'),
            Description = c.Description,
            ImageUrl = c.ImageUrl,
            DisplayOrder = c.DisplayOrder,
            IsActive = true
        }));

        await db.SaveChangesAsync(ct);
    }

    private async Task SeedMenuItemsAsync(CancellationToken ct)
    {
        if (await db.MenuItems.AnyAsync(ct))
            return;

        logger.LogInformation("Seeding menu items");

        var categories = await db.Categories.ToDictionaryAsync(c => c.Name, ct);

        db.MenuItems.AddRange(SeedData.MenuItems.Select(m => new MenuItem
        {
            Name = m.Name,
            Description = m.Description,
            Price = m.Price,
            ImageUrl = m.ImageUrl,
            CategoryId = categories[m.Category].Id,
            IsAvailable = true,
            Availability = m.Availability,
            PreparationMinutes = m.PreparationMinutes,
            IsVegetarian = m.IsVegetarian,
            IsSpicy = m.IsSpicy
        }));

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Plans the past week (so history looks real) and the next two weeks (so the planner and
    /// the customer menu have something to show today and tomorrow).
    ///
    /// Every dish a customer can order has to be on the day's plan, so each day gets the full
    /// set of staples plus that weekday's rotating specials — exactly what a chef would build
    /// with the planner's "add staples" button and then a handful of picks on top.
    /// </summary>
    private async Task SeedDailyMenusAsync(CancellationToken ct)
    {
        if (await db.DailyMenuItems.AnyAsync(ct))
            return;

        logger.LogInformation("Seeding daily menu schedule");

        var items = await db.MenuItems.ToListAsync(ct);
        var itemsByName = items.ToDictionary(m => m.Name);
        var staples = items.Where(m => m.Availability == MenuAvailability.Everyday).ToList();
        var today = clock.Today;

        for (var offset = -7; offset <= 14; offset++)
        {
            var date = today.AddDays(offset);

            // A dish can only be on a day once, so track what this day already has. A staple
            // that also appears in the weekly rotation must not be scheduled twice.
            var scheduled = new HashSet<int>();

            // Staples: always on, no daily limit.
            foreach (var staple in staples)
            {
                scheduled.Add(staple.Id);
                db.DailyMenuItems.Add(new DailyMenuItem
                {
                    MenuDate = date,
                    MenuItemId = staple.Id,
                    QuantityAvailable = null
                });
            }

            // Specials: this weekday's rotation, some portioned, some discounted.
            foreach (var name in SeedData.WeeklyRotation[date.DayOfWeek])
            {
                if (!itemsByName.TryGetValue(name, out var item) || !scheduled.Add(item.Id))
                    continue;

                db.DailyMenuItems.Add(new DailyMenuItem
                {
                    MenuDate = date,
                    MenuItemId = item.Id,
                    // Roughly half carry a daily limit — enough to demonstrate sell-outs
                    // without making the demo menu feel empty.
                    QuantityAvailable = _random.Next(0, 2) == 0 ? _random.Next(12, 31) : null,
                    SpecialPrice = _random.Next(0, 4) == 0
                        ? Math.Round(item.Price * 0.85m, 2, MidpointRounding.AwayFromZero)
                        : null,
                    Note = _random.Next(0, 5) == 0 ? "Chef's pick" : null
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Generates two weeks of completed orders plus a handful of live ones, so the dashboard
    /// charts, the kitchen board and "my orders" all have content on first run.
    /// </summary>
    private async Task SeedOrderHistoryAsync(CancellationToken ct)
    {
        if (await db.Orders.AnyAsync(ct))
            return;

        logger.LogInformation("Seeding order history");

        var customers = await db.Users.Where(u => u.Role == UserRole.Customer).ToListAsync(ct);
        var staff = await db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Staff, ct);
        var menuItems = await db.MenuItems.Where(m => m.IsAvailable).ToListAsync(ct);

        if (customers.Count == 0 || menuItems.Count == 0)
            return;

        var today = clock.Today;
        var orders = new List<Order>();

        for (var dayOffset = 13; dayOffset >= 0; dayOffset--)
        {
            var date = today.AddDays(-dayOffset);

            // Weekends are busier, which makes the revenue chart look like a real restaurant.
            var isWeekend = date.DayOfWeek is DayOfWeek.Friday or DayOfWeek.Saturday;
            var orderCount = isWeekend ? _random.Next(9, 16) : _random.Next(4, 10);

            for (var i = 0; i < orderCount; i++)
            {
                var placedAt = date
                    .ToDateTime(new TimeOnly(11, 0))
                    .AddMinutes(_random.Next(0, 11 * 60));

                // Today's orders stay in-flight so the kitchen board is not empty on first run.
                var status = dayOffset == 0
                    ? PickLiveStatus()
                    : _random.Next(0, 12) == 0 ? OrderStatus.Cancelled : OrderStatus.Completed;

                orders.Add(BuildOrder(customers, menuItems, staff, placedAt, status));
            }
        }

        db.Orders.AddRange(orders);
        await db.SaveChangesAsync(ct);

        // Order numbers embed the identity value, so they are assigned after the insert.
        foreach (var order in orders)
            order.OrderNumber = $"ORD-{order.PlacedAt:yyyyMMdd}-{order.Id:D5}";

        await db.SaveChangesAsync(ct);

        logger.LogInformation("Seeded {Count} demo orders", orders.Count);
    }

    private OrderStatus PickLiveStatus() => _random.Next(0, 4) switch
    {
        0 => OrderStatus.New,
        1 => OrderStatus.Preparing,
        2 => OrderStatus.Ready,
        _ => OrderStatus.Completed
    };

    private Order BuildOrder(
        List<User> customers,
        List<MenuItem> menuItems,
        User? staff,
        DateTime placedAt,
        OrderStatus status)
    {
        var customer = customers[_random.Next(customers.Count)];
        var type = (OrderType)_random.Next(1, 4);

        var order = new Order
        {
            CustomerId = customer.Id,
            OrderNumber = $"TMP-{Guid.NewGuid():N}"[..30],
            Status = status,
            Type = type,
            TableNumber = type == OrderType.DineIn ? $"T{_random.Next(1, 21)}" : null,
            DeliveryAddress = type == OrderType.Delivery ? "42 Maple Street, Springfield" : null,
            ContactPhone = customer.PhoneNumber,
            PlacedAt = placedAt,
            CreatedAt = placedAt
        };

        var chosen = menuItems.OrderBy(_ => _random.Next()).Take(_random.Next(1, 5)).ToList();
        decimal subtotal = 0;

        foreach (var item in chosen)
        {
            var quantity = _random.Next(1, 4);
            var lineTotal = OrderPricing.Round(item.Price * quantity);
            subtotal += lineTotal;

            order.Items.Add(new OrderItem
            {
                MenuItemId = item.Id,
                ItemName = item.Name,
                UnitPrice = item.Price,
                Quantity = quantity,
                LineTotal = lineTotal
            });
        }

        var totals = OrderPricing.Calculate(subtotal, type, _options);
        order.Subtotal = totals.Subtotal;
        order.TaxAmount = totals.TaxAmount;
        order.DeliveryFee = totals.DeliveryFee;
        order.TotalAmount = totals.Total;

        ApplyLifecycle(order, status, staff, placedAt);

        return order;
    }

    /// <summary>Back-fills timestamps and the audit trail so seeded orders look genuinely lived-through.</summary>
    private void ApplyLifecycle(Order order, OrderStatus status, User? staff, DateTime placedAt)
    {
        order.StatusHistory.Add(new OrderStatusHistory
        {
            ToStatus = OrderStatus.New,
            ChangedByUserId = order.CustomerId,
            ChangedAt = placedAt,
            Note = "Order placed"
        });

        if (status == OrderStatus.Cancelled)
        {
            order.CancelledAt = placedAt.AddMinutes(_random.Next(2, 10));
            order.CancellationReason = "Customer changed their mind";
            order.StatusHistory.Add(new OrderStatusHistory
            {
                FromStatus = OrderStatus.New,
                ToStatus = OrderStatus.Cancelled,
                ChangedByUserId = order.CustomerId,
                ChangedAt = order.CancelledAt.Value,
                Note = order.CancellationReason
            });
            return;
        }

        if (status >= OrderStatus.Preparing)
        {
            order.PreparingAt = placedAt.AddMinutes(_random.Next(1, 6));
            AddHistory(order, OrderStatus.New, OrderStatus.Preparing, staff, order.PreparingAt.Value);
        }

        if (status >= OrderStatus.Ready)
        {
            order.ReadyAt = order.PreparingAt!.Value.AddMinutes(_random.Next(10, 26));
            AddHistory(order, OrderStatus.Preparing, OrderStatus.Ready, staff, order.ReadyAt.Value);
        }

        if (status == OrderStatus.Completed)
        {
            order.CompletedAt = order.ReadyAt!.Value.AddMinutes(_random.Next(2, 15));
            AddHistory(order, OrderStatus.Ready, OrderStatus.Completed, staff, order.CompletedAt.Value);
        }
    }

    private static void AddHistory(Order order, OrderStatus from, OrderStatus to, User? staff, DateTime at) =>
        order.StatusHistory.Add(new OrderStatusHistory
        {
            FromStatus = from,
            ToStatus = to,
            ChangedByUserId = staff?.Id,
            ChangedAt = at
        });
}
