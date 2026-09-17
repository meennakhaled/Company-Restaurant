using Restaurant.Application.Common.Models;

namespace Restaurant.Application.Menu.Dtos;

/// <summary>
/// What a customer sees. Price is already resolved server-side (daily special price wins
/// over the base price) so the client never computes money.
/// </summary>
public record CustomerMenuItemDto(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    decimal? OriginalPrice,
    string? ImageUrl,
    int CategoryId,
    string CategoryName,
    int PreparationMinutes,
    bool IsVegetarian,
    bool IsSpicy,
    bool IsDailySpecial,
    bool IsSoldOut,
    int? RemainingQuantity,
    string? DailyNote);

public class CustomerMenuQuery : QueryParameters
{
    /// <summary>Service date to show. Defaults to today; customers may not browse other dates.</summary>
    public DateOnly? Date { get; set; }

    public int? CategoryId { get; set; }

    /// <summary>When true, hides items that are already sold out for the day.</summary>
    public bool OnlyAvailable { get; set; }

    /// <summary>When true, returns only today's scheduled specials.</summary>
    public bool OnlySpecials { get; set; }
}
