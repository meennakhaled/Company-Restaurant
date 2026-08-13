namespace Restaurant.Domain.Entities;

/// <summary>
/// A line on an order. Name and price are snapshotted at purchase time so that later
/// menu edits (a rename or a price rise) never rewrite historical orders or revenue reports.
/// </summary>
public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public Order Order { get; set; } = null!;

    public int MenuItemId { get; set; }

    public MenuItem MenuItem { get; set; } = null!;

    public string ItemName { get; set; } = string.Empty;

    public decimal UnitPrice { get; set; }

    public int Quantity { get; set; }

    public decimal LineTotal { get; set; }

    /// <summary>Per-line customer request, e.g. "no onions".</summary>
    public string? Notes { get; set; }
}
