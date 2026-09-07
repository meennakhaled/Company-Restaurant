using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Application.DailyMenus.Dtos;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.DailyMenus;

/// <summary>
/// Planning side of the daily menu: which dishes the kitchen is offering on which date,
/// in what quantity and at what price. The customer-facing read is in <c>CustomerMenuService</c>.
/// </summary>
public class DailyMenuService(IApplicationDbContext db, IClock clock) : IDailyMenuService
{
    public async Task<DailyMenuDto> GetForDateAsync(DateOnly date, CancellationToken ct = default)
    {
        var items = await db.DailyMenuItems
            .AsNoTracking()
            .Where(d => d.MenuDate == date)
            .OrderBy(d => d.MenuItem.Category.DisplayOrder)
            .ThenBy(d => d.MenuItem.Name)
            .Select(Projection)
            .ToListAsync(ct);

        return new DailyMenuDto(date, items, items.Count, items.Count(i => i.IsExhausted));
    }

    public async Task<IReadOnlyList<DailyMenuCalendarDayDto>> GetCalendarAsync(
        DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        if (to < from)
            throw new BusinessRuleException("The end date must be on or after the start date.");

        if (to.DayNumber - from.DayNumber > 366)
            throw new BusinessRuleException("The calendar range cannot be longer than a year.");

        // Aggregated in SQL — the planner never pulls individual dish rows for a whole month.
        return await db.DailyMenuItems
            .AsNoTracking()
            .Where(d => d.MenuDate >= from && d.MenuDate <= to)
            .GroupBy(d => d.MenuDate)
            // Ordered on the grouping key, before projection — SQL Server cannot sort by a
            // property of the projected DTO.
            .OrderBy(g => g.Key)
            .Select(g => new DailyMenuCalendarDayDto(
                g.Key,
                g.Count(),
                g.Count(d => d.IsSoldOut || (d.QuantityAvailable != null && d.QuantitySold >= d.QuantityAvailable))))
            .ToListAsync(ct);
    }

    public async Task<DailyMenuItemDto> AddItemAsync(
        DateOnly date, AddDailyMenuItemRequest request, CancellationToken ct = default)
    {
        EnsureDateIsPlannable(date);

        var menuItem = await db.MenuItems
            .FirstOrDefaultAsync(m => m.Id == request.MenuItemId && !m.IsDeleted, ct)
            ?? throw NotFoundException.For("Menu item", request.MenuItemId);

        if (await db.DailyMenuItems.AnyAsync(d => d.MenuDate == date && d.MenuItemId == menuItem.Id, ct))
            throw new ConflictException($"'{menuItem.Name}' is already on the menu for {date:yyyy-MM-dd}.");

        var entry = new DailyMenuItem
        {
            MenuDate = date,
            MenuItemId = menuItem.Id,
            QuantityAvailable = request.QuantityAvailable,
            SpecialPrice = request.SpecialPrice,
            Note = Trimmed(request.Note)
        };

        db.DailyMenuItems.Add(entry);
        await db.SaveChangesAsync(ct);

        return await LoadAsync(entry.Id, ct);
    }

    public async Task<DailyMenuItemDto> UpdateItemAsync(
        int id, UpdateDailyMenuItemRequest request, CancellationToken ct = default)
    {
        var entry = await db.DailyMenuItems.FirstOrDefaultAsync(d => d.Id == id, ct)
                    ?? throw NotFoundException.For("Daily menu entry", id);

        // Reducing the day's quantity below what has already been sold would make the
        // remaining count negative and misreport the kitchen's position.
        if (request.QuantityAvailable is { } quantity && quantity < entry.QuantitySold)
            throw new BusinessRuleException(
                $"{entry.QuantitySold} portion(s) have already been ordered, so the quantity cannot be set below that.");

        entry.QuantityAvailable = request.QuantityAvailable;
        entry.SpecialPrice = request.SpecialPrice;
        entry.IsSoldOut = request.IsSoldOut;
        entry.Note = Trimmed(request.Note);

        await db.SaveChangesAsync(ct);
        return await LoadAsync(id, ct);
    }

    public async Task<DailyMenuItemDto> SetSoldOutAsync(int id, bool isSoldOut, CancellationToken ct = default)
    {
        var entry = await db.DailyMenuItems.FirstOrDefaultAsync(d => d.Id == id, ct)
                    ?? throw NotFoundException.For("Daily menu entry", id);

        entry.IsSoldOut = isSoldOut;
        await db.SaveChangesAsync(ct);

        return await LoadAsync(id, ct);
    }

    public async Task RemoveItemAsync(int id, CancellationToken ct = default)
    {
        var entry = await db.DailyMenuItems
            .Include(d => d.MenuItem)
            .FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw NotFoundException.For("Daily menu entry", id);

        // Once portions are sold the row is part of the day's record. Staff should mark it
        // sold out instead, which stops new orders without erasing what already happened.
        if (entry.QuantitySold > 0)
            throw new ConflictException(
                $"'{entry.MenuItem.Name}' has already been ordered today. Mark it as sold out instead of removing it.");

        db.DailyMenuItems.Remove(entry);
        await db.SaveChangesAsync(ct);
    }

    public async Task<int> AddStaplesAsync(DateOnly date, CancellationToken ct = default)
    {
        EnsureDateIsPlannable(date);

        var alreadyScheduled = await db.DailyMenuItems
            .Where(d => d.MenuDate == date)
            .Select(d => d.MenuItemId)
            .ToListAsync(ct);

        var staples = await db.MenuItems
            .Where(m => !m.IsDeleted
                        && m.IsAvailable
                        && m.Availability == MenuAvailability.Everyday
                        && !alreadyScheduled.Contains(m.Id))
            .Select(m => m.Id)
            .ToListAsync(ct);

        foreach (var menuItemId in staples)
        {
            db.DailyMenuItems.Add(new DailyMenuItem
            {
                MenuDate = date,
                MenuItemId = menuItemId,
                // Staples are kitchen-stocked rather than portioned for the day, so they go on
                // unlimited. The chef can still cap or sell out any of them individually.
                QuantityAvailable = null
            });
        }

        await db.SaveChangesAsync(ct);
        return staples.Count;
    }

    public async Task<int> CopyAsync(CopyDailyMenuRequest request, CancellationToken ct = default)
    {
        if (request.TargetDates.Count == 0)
            throw new BusinessRuleException("Select at least one date to copy the menu to.");

        var targets = request.TargetDates.Distinct().Where(d => d != request.SourceDate).ToList();
        if (targets.Count == 0)
            throw new BusinessRuleException("The target dates must be different from the source date.");

        foreach (var target in targets)
            EnsureDateIsPlannable(target);

        var source = await db.DailyMenuItems
            .AsNoTracking()
            .Where(d => d.MenuDate == request.SourceDate)
            .ToListAsync(ct);

        if (source.Count == 0)
            throw new BusinessRuleException($"There is no menu planned for {request.SourceDate:yyyy-MM-dd} to copy.");

        var existing = await db.DailyMenuItems
            .Where(d => targets.Contains(d.MenuDate))
            .ToListAsync(ct);

        if (request.Overwrite)
        {
            // Rows with sales are kept — they are part of that day's record.
            var replaceable = existing.Where(d => d.QuantitySold == 0).ToList();
            db.DailyMenuItems.RemoveRange(replaceable);
            existing = existing.Except(replaceable).ToList();
        }

        var alreadyScheduled = existing
            .Select(d => (d.MenuDate, d.MenuItemId))
            .ToHashSet();

        var copied = 0;
        foreach (var target in targets)
        {
            foreach (var item in source)
            {
                if (!alreadyScheduled.Add((target, item.MenuItemId)))
                    continue;

                db.DailyMenuItems.Add(new DailyMenuItem
                {
                    MenuDate = target,
                    MenuItemId = item.MenuItemId,
                    QuantityAvailable = item.QuantityAvailable,
                    SpecialPrice = item.SpecialPrice,
                    Note = item.Note
                });
                copied++;
            }
        }

        await db.SaveChangesAsync(ct);
        return copied;
    }

    private void EnsureDateIsPlannable(DateOnly date)
    {
        if (date < clock.Today)
            throw new BusinessRuleException("The daily menu cannot be changed for a date in the past.");

        if (date.DayNumber - clock.Today.DayNumber > 365)
            throw new BusinessRuleException("The daily menu can only be planned up to a year ahead.");
    }

    private async Task<DailyMenuItemDto> LoadAsync(int id, CancellationToken ct)
    {
        var dto = await db.DailyMenuItems
            .AsNoTracking()
            .Where(d => d.Id == id)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

        return dto ?? throw NotFoundException.For("Daily menu entry", id);
    }

    private static string? Trimmed(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static Expression<Func<DailyMenuItem, DailyMenuItemDto>> Projection =>
        d => new DailyMenuItemDto(
            d.Id,
            d.MenuDate,
            d.MenuItemId,
            d.MenuItem.Name,
            d.MenuItem.Description,
            d.MenuItem.ImageUrl,
            d.MenuItem.CategoryId,
            d.MenuItem.Category.Name,
            d.MenuItem.Price,
            d.SpecialPrice,
            d.SpecialPrice ?? d.MenuItem.Price,
            d.QuantityAvailable,
            d.QuantitySold,
            d.QuantityAvailable == null ? null : d.QuantityAvailable - d.QuantitySold,
            d.IsSoldOut,
            d.IsSoldOut || (d.QuantityAvailable != null && d.QuantitySold >= d.QuantityAvailable),
            d.Note);
}
