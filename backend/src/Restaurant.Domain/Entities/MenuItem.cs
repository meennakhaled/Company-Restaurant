using Restaurant.Domain.Common;
using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Entities;

public class MenuItem : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }

    public int CategoryId { get; set; }

    public Category Category { get; set; } = null!;

    /// <summary>Master switch: false hides the item everywhere regardless of the daily menu.</summary>
    public bool IsAvailable { get; set; } = true;

    public MenuAvailability Availability { get; set; } = MenuAvailability.Everyday;

    /// <summary>Shown to customers as an estimate and used to order the kitchen queue.</summary>
    public int PreparationMinutes { get; set; } = 15;

    public bool IsVegetarian { get; set; }

    public bool IsSpicy { get; set; }

    /// <summary>
    /// Soft delete. Menu items are referenced by historical orders, so they are archived
    /// rather than removed — deleting rows would break order history.
    /// </summary>
    public bool IsDeleted { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public ICollection<DailyMenuItem> DailyMenuItems { get; set; } = new List<DailyMenuItem>();
}
