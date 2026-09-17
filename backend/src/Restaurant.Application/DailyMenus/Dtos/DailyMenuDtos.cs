namespace Restaurant.Application.DailyMenus.Dtos;

public record DailyMenuItemDto(
    int Id,
    DateOnly MenuDate,
    int MenuItemId,
    string ItemName,
    string? Description,
    string? ImageUrl,
    int CategoryId,
    string CategoryName,
    decimal BasePrice,
    decimal? SpecialPrice,
    decimal EffectivePrice,
    int? QuantityAvailable,
    int QuantitySold,
    int? RemainingQuantity,
    bool IsSoldOut,
    bool IsExhausted,
    string? Note);

/// <summary>The full plan for one service date, as the chef's planner sees it.</summary>
public record DailyMenuDto(
    DateOnly Date,
    IReadOnlyList<DailyMenuItemDto> Items,
    int TotalItems,
    int SoldOutItems);

public record AddDailyMenuItemRequest(
    int MenuItemId,
    int? QuantityAvailable,
    decimal? SpecialPrice,
    string? Note);

public record UpdateDailyMenuItemRequest(
    int? QuantityAvailable,
    decimal? SpecialPrice,
    bool IsSoldOut,
    string? Note);

/// <summary>
/// Copies a planned day onto one or more future dates — the single most common planning
/// action ("same as last Monday"), and much faster than re-picking every dish.
/// </summary>
public record CopyDailyMenuRequest(
    DateOnly SourceDate,
    IReadOnlyList<DateOnly> TargetDates,
    bool Overwrite);

/// <summary>One cell in the planner's month view.</summary>
public record DailyMenuCalendarDayDto(
    DateOnly Date,
    int ItemCount,
    int SoldOutCount);
