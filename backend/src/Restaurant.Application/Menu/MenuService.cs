using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Menu.Dtos;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Menu;

/// <summary>
/// Resolves what is actually orderable on a given service date.
///
/// A dish is on the menu for date D only when the kitchen scheduled it onto D. Nothing
/// appears automatically: the daily menu planner is the single source of truth for what is
/// for sale, so a customer can never order something the chef did not plan to cook.
///
/// <see cref="MenuAvailability.Everyday"/> marks a staple the kitchen normally serves every
/// day — the planner offers to add all staples to a day in one click — but it still has to
/// be on the day's plan to be sold.
///
/// The same query backs both the customer menu and order pricing, so what a customer is
/// shown and what they are charged can never drift apart.
/// </summary>
public class MenuService(IApplicationDbContext db, IClock clock) : IMenuService
{
    public async Task<PagedResult<CustomerMenuItemDto>> BrowseAsync(
        CustomerMenuQuery query, CancellationToken ct = default)
    {
        var date = query.Date ?? clock.Today;
        var rows = BuildMenuQuery(date);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            rows = rows.Where(r =>
                EF.Functions.Like(r.Item.Name, $"%{term}%") ||
                (r.Item.Description != null && EF.Functions.Like(r.Item.Description, $"%{term}%")) ||
                EF.Functions.Like(r.Item.Category.Name, $"%{term}%"));
        }

        if (query.CategoryId is { } categoryId)
            rows = rows.Where(r => r.Item.CategoryId == categoryId);

        // "Specials" now means the occasional dishes, as opposed to the everyday staples that
        // also have to be scheduled onto the day.
        if (query.OnlySpecials)
            rows = rows.Where(r => r.Item.Availability == MenuAvailability.DailySpecial);

        if (query.OnlyAvailable)
            rows = rows.Where(r => !r.Daily.IsSoldOut &&
                                   (r.Daily.QuantityAvailable == null ||
                                    r.Daily.QuantitySold < r.Daily.QuantityAvailable));

        rows = ApplySort(rows, query.SortBy, query.SortDescending);

        return await rows.Select(ToDto).ToPagedResultAsync(query.Page, query.PageSize, ct);
    }

    public async Task<CustomerMenuItemDto> GetItemAsync(
        int menuItemId, DateOnly? date, CancellationToken ct = default)
    {
        var serviceDate = date ?? clock.Today;

        var dto = await BuildMenuQuery(serviceDate)
            .Where(r => r.Item.Id == menuItemId)
            .Select(ToDto)
            .FirstOrDefaultAsync(ct);

        return dto ?? throw new NotFoundException("This dish is not on the menu today.");
    }

    public async Task<IReadOnlyDictionary<int, SellableMenuItem>> GetSellableAsync(
        DateOnly date, IReadOnlyCollection<int> menuItemIds, CancellationToken ct = default)
    {
        if (menuItemIds.Count == 0)
            return new Dictionary<int, SellableMenuItem>();

        var rows = await BuildMenuQuery(date)
            .Where(r => menuItemIds.Contains(r.Item.Id))
            .Select(r => new SellableMenuItem(
                r.Item.Id,
                r.Item.Name,
                r.Daily.SpecialPrice ?? r.Item.Price,
                r.Daily.Id,
                r.Daily.QuantityAvailable == null
                    ? null
                    : r.Daily.QuantityAvailable.Value - r.Daily.QuantitySold,
                r.Daily.IsSoldOut))
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.MenuItemId);
    }

    /// <summary>
    /// Starts from the day's plan and joins each scheduled row to its dish. Because this is an
    /// inner join, a dish with no schedule row for the date simply does not exist on the menu.
    /// The dish's own switches still apply on top: an archived, hidden or uncategorised dish
    /// stays off the menu even if someone scheduled it.
    /// </summary>
    private IQueryable<MenuRow> BuildMenuQuery(DateOnly date) =>
        from daily in db.DailyMenuItems.AsNoTracking().Where(d => d.MenuDate == date)
        join item in db.MenuItems.AsNoTracking() on daily.MenuItemId equals item.Id
        where !item.IsDeleted
              && item.IsAvailable
              && item.Category.IsActive
        select new MenuRow { Item = item, Daily = daily };

    private static IQueryable<MenuRow> ApplySort(IQueryable<MenuRow> rows, string? sortBy, bool descending) =>
        (sortBy?.ToLowerInvariant()) switch
        {
            "price" => descending
                ? rows.OrderByDescending(r => r.Daily.SpecialPrice ?? r.Item.Price)
                : rows.OrderBy(r => r.Daily.SpecialPrice ?? r.Item.Price),
            "name" => descending ? rows.OrderByDescending(r => r.Item.Name) : rows.OrderBy(r => r.Item.Name),
            // Default leads with the chef's specials — they are what the restaurant wants to
            // sell today — then falls back to the normal category order.
            _ => rows
                .OrderBy(r => r.Item.Availability == MenuAvailability.DailySpecial ? 0 : 1)
                .ThenBy(r => r.Item.Category.DisplayOrder)
                .ThenBy(r => r.Item.Name)
        };

    private static System.Linq.Expressions.Expression<Func<MenuRow, CustomerMenuItemDto>> ToDto =>
        r => new CustomerMenuItemDto(
            r.Item.Id,
            r.Item.Name,
            r.Item.Description,
            r.Daily.SpecialPrice ?? r.Item.Price,
            // Only surface a struck-through original price when today's price is genuinely lower.
            r.Daily.SpecialPrice != null && r.Daily.SpecialPrice < r.Item.Price ? r.Item.Price : null,
            r.Item.ImageUrl,
            r.Item.CategoryId,
            r.Item.Category.Name,
            r.Item.PreparationMinutes,
            r.Item.IsVegetarian,
            r.Item.IsSpicy,
            r.Item.Availability == MenuAvailability.DailySpecial,
            r.Daily.IsSoldOut ||
                (r.Daily.QuantityAvailable != null && r.Daily.QuantitySold >= r.Daily.QuantityAvailable),
            r.Daily.QuantityAvailable == null
                ? null
                : r.Daily.QuantityAvailable.Value - r.Daily.QuantitySold,
            r.Daily.Note);

    /// <summary>Join shape carried through the query so filters and projections share one definition.</summary>
    private sealed class MenuRow
    {
        public MenuItem Item { get; init; } = null!;

        /// <summary>Never null — the query is driven by the day's plan.</summary>
        public DailyMenuItem Daily { get; init; } = null!;
    }
}
