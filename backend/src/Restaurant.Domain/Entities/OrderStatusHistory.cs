using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Entities;

/// <summary>
/// Append-only audit trail of every status transition, so a disputed order can be
/// traced back to who moved it and when. Also powers the customer's tracking timeline.
/// </summary>
public class OrderStatusHistory
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public OrderStatus? FromStatus { get; set; }

    public OrderStatus ToStatus { get; set; }

    /// <summary>Null when the system made the change rather than a person.</summary>
    public int? ChangedByUserId { get; set; }

    public User? ChangedByUser { get; set; }

    public DateTime ChangedAt { get; set; }

    public string? Note { get; set; }
}
