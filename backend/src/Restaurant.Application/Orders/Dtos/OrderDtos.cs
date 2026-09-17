using Restaurant.Application.Common.Models;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Orders.Dtos;

public record PlaceOrderItemRequest(int MenuItemId, int Quantity, string? Notes);

/// <summary>
/// Note there is no price or total here on purpose — the server prices every line from the
/// live menu, so a tampered client payload cannot change what the customer is charged.
/// </summary>
public record PlaceOrderRequest(
    OrderType Type,
    string? TableNumber,
    string? DeliveryAddress,
    string? ContactPhone,
    string? Notes,
    IReadOnlyList<PlaceOrderItemRequest> Items);

public record OrderItemDto(
    int Id,
    int MenuItemId,
    string ItemName,
    string? ImageUrl,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal,
    string? Notes);

public record OrderStatusHistoryDto(
    OrderStatus? FromStatus,
    OrderStatus ToStatus,
    string? ChangedByName,
    DateTime ChangedAt,
    string? Note);

public record OrderDto(
    int Id,
    string OrderNumber,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    OrderStatus Status,
    OrderType Type,
    string? TableNumber,
    string? DeliveryAddress,
    string? ContactPhone,
    string? Notes,
    decimal Subtotal,
    decimal TaxAmount,
    decimal DeliveryFee,
    decimal TotalAmount,
    int ItemCount,
    DateTime PlacedAt,
    DateTime? PreparingAt,
    DateTime? ReadyAt,
    DateTime? CompletedAt,
    DateTime? CancelledAt,
    string? CancellationReason,
    IReadOnlyList<OrderStatus> AllowedNextStatuses,
    IReadOnlyList<OrderItemDto> Items,
    IReadOnlyList<OrderStatusHistoryDto> StatusHistory);

/// <summary>Lightweight row for order tables and the kitchen board.</summary>
public record OrderSummaryDto(
    int Id,
    string OrderNumber,
    string CustomerName,
    OrderStatus Status,
    OrderType Type,
    string? TableNumber,
    decimal TotalAmount,
    int ItemCount,
    DateTime PlacedAt);

public record UpdateOrderStatusRequest(OrderStatus Status, string? Note);

public record CancelOrderRequest(string? Reason);

public class OrderQuery : QueryParameters
{
    public OrderStatus? Status { get; set; }

    public OrderType? Type { get; set; }

    public DateOnly? FromDate { get; set; }

    public DateOnly? ToDate { get; set; }

    /// <summary>Kitchen board filter: only orders that still need action (New / Preparing / Ready).</summary>
    public bool ActiveOnly { get; set; }
}

/// <summary>Server-side pricing preview so the cart total always matches what checkout will charge.</summary>
public record CartPreviewRequest(OrderType Type, IReadOnlyList<PlaceOrderItemRequest> Items);

public record CartPreviewLineDto(
    int MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal,
    bool IsAvailable,
    string? UnavailableReason);

public record CartPreviewDto(
    IReadOnlyList<CartPreviewLineDto> Lines,
    decimal Subtotal,
    decimal TaxAmount,
    decimal DeliveryFee,
    decimal TotalAmount,
    bool CanCheckout);
