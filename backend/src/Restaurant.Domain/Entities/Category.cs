using Restaurant.Domain.Common;

namespace Restaurant.Domain.Entities;

public class Category : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-friendly identifier used by the customer menu (e.g. "main-courses").</summary>
    public string Slug { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? ImageUrl { get; set; }

    /// <summary>Controls the order categories appear in on the menu.</summary>
    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<MenuItem> MenuItems { get; set; } = new List<MenuItem>();
}
