using Restaurant.Application.Common.Models;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.MenuItems.Dtos;

public record MenuItemDto(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    int CategoryId,
    string CategoryName,
    bool IsAvailable,
    MenuAvailability Availability,
    int PreparationMinutes,
    bool IsVegetarian,
    bool IsSpicy,
    DateTime CreatedAt);

public record SaveMenuItemRequest(
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    int CategoryId,
    bool IsAvailable,
    MenuAvailability Availability,
    int PreparationMinutes,
    bool IsVegetarian,
    bool IsSpicy);

public record SetAvailabilityRequest(bool IsAvailable);

/// <summary>Admin-side catalogue browsing: every item, including unavailable ones.</summary>
public class MenuItemQuery : QueryParameters
{
    public int? CategoryId { get; set; }

    public bool? IsAvailable { get; set; }

    public MenuAvailability? Availability { get; set; }

    public decimal? MinPrice { get; set; }

    public decimal? MaxPrice { get; set; }
}
