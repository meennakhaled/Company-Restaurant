using Restaurant.Application.DailyMenus.Dtos;

namespace Restaurant.Application.DailyMenus;

public interface IDailyMenuService
{
    Task<DailyMenuDto> GetForDateAsync(DateOnly date, CancellationToken ct = default);

    /// <summary>Per-day counts used to paint the planner's calendar.</summary>
    Task<IReadOnlyList<DailyMenuCalendarDayDto>> GetCalendarAsync(DateOnly from, DateOnly to, CancellationToken ct = default);

    Task<DailyMenuItemDto> AddItemAsync(DateOnly date, AddDailyMenuItemRequest request, CancellationToken ct = default);

    Task<DailyMenuItemDto> UpdateItemAsync(int id, UpdateDailyMenuItemRequest request, CancellationToken ct = default);

    Task<DailyMenuItemDto> SetSoldOutAsync(int id, bool isSoldOut, CancellationToken ct = default);

    Task RemoveItemAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Adds every everyday staple that is not already on the day, with no quantity limit.
    /// Nothing reaches the customer menu without being planned, so this is what stops that
    /// rule turning into busywork for the kitchen. Returns the number added.
    /// </summary>
    Task<int> AddStaplesAsync(DateOnly date, CancellationToken ct = default);

    /// <summary>Duplicates one planned day onto other dates. Returns the number of dishes copied.</summary>
    Task<int> CopyAsync(CopyDailyMenuRequest request, CancellationToken ct = default);
}
