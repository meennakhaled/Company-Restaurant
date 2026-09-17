namespace Restaurant.Application.Common.Settings;

/// <summary>
/// Commercial rules that a restaurant owner would realistically want to change without a
/// code change. Bound from the "Restaurant" configuration section.
/// </summary>
public class RestaurantOptions
{
    public const string SectionName = "Restaurant";

    public string Name { get; set; } = "Saffron & Sage";

    public string Currency { get; set; } = "USD";

    /// <summary>Sales tax applied to the order subtotal, e.g. 0.10 for 10%.</summary>
    public decimal TaxRate { get; set; } = 0.10m;

    public decimal DeliveryFee { get; set; } = 3.50m;

    /// <summary>Orders at or above this subtotal ship free.</summary>
    public decimal FreeDeliveryThreshold { get; set; } = 40m;

    /// <summary>Guards against a single order draining stock or being a typo.</summary>
    public int MaxQuantityPerItem { get; set; } = 20;

    public int MaxItemsPerOrder { get; set; } = 50;

    /// <summary>IANA/Windows timezone that defines the restaurant's service date.</summary>
    public string TimeZone { get; set; } = "UTC";
}
