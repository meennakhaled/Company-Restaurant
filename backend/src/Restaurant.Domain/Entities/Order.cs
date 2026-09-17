using Restaurant.Domain.Common;
using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Entities;

public class Order : AuditableEntity
{
    /// <summary>Human-readable reference shown to customers and staff, e.g. "ORD-20260813-0042".</summary>
    public string OrderNumber { get; set; } = string.Empty;

    public int CustomerId { get; set; }

    public User Customer { get; set; } = null!;

    public OrderStatus Status { get; set; } = OrderStatus.New;

    public OrderType Type { get; set; } = OrderType.DineIn;

    /// <summary>Required for dine-in orders only.</summary>
    public string? TableNumber { get; set; }

    /// <summary>Required for delivery orders only.</summary>
    public string? DeliveryAddress { get; set; }

    public string? ContactPhone { get; set; }

    public string? Notes { get; set; }

    // Money columns are all computed server-side from current menu prices — never from the client.
    public decimal Subtotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal DeliveryFee { get; set; }

    public decimal TotalAmount { get; set; }

    public DateTime PlacedAt { get; set; }

    public DateTime? PreparingAt { get; set; }

    public DateTime? ReadyAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public string? CancellationReason { get; set; }

    /// <summary>
    /// Optimistic concurrency guard: two staff members changing the same order at once
    /// makes the second save fail instead of silently overwriting the first.
    /// </summary>
    public byte[] RowVersion { get; set; } = [];

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
}
