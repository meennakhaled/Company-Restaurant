using Restaurant.Domain.Common;

namespace Restaurant.Domain.Entities;

/// <summary>
/// One dish scheduled onto the menu for one specific date.
/// A unique index on (MenuDate, MenuItemId) prevents the same dish being scheduled twice.
/// </summary>
public class DailyMenuItem : AuditableEntity
{
    /// <summary>The service date this dish is offered on. Date-only, no time component.</summary>
    public DateOnly MenuDate { get; set; }

    public int MenuItemId { get; set; }

    public MenuItem MenuItem { get; set; } = null!;

    /// <summary>Portions the kitchen prepared for the day. Null means unlimited.</summary>
    public int? QuantityAvailable { get; set; }

    /// <summary>Incremented as orders are placed; used to auto-sell-out limited dishes.</summary>
    public int QuantitySold { get; set; }

    /// <summary>Manual override so staff can pull a dish mid-service without deleting it.</summary>
    public bool IsSoldOut { get; set; }

    /// <summary>Optional promotional price for this date only. Falls back to MenuItem.Price.</summary>
    public decimal? SpecialPrice { get; set; }

    /// <summary>Short kitchen/customer note, e.g. "Chef's pick" or "served with garlic bread".</summary>
    public string? Note { get; set; }

    /// <summary>
    /// Optimistic concurrency guard for the sold counter. Two customers racing for the last
    /// portion make the second checkout fail cleanly instead of overselling the kitchen.
    /// </summary>
    public byte[] RowVersion { get; set; } = [];

    /// <summary>Portions still sellable, or null when the dish has no daily limit.</summary>
    public int? RemainingQuantity =>
        QuantityAvailable is null ? null : Math.Max(0, QuantityAvailable.Value - QuantitySold);

    /// <summary>True when the dish can no longer be ordered today, for either reason.</summary>
    public bool IsExhausted => IsSoldOut || RemainingQuantity == 0;
}
