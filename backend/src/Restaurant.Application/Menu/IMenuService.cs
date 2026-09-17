using Restaurant.Application.Common.Models;
using Restaurant.Application.Menu.Dtos;

namespace Restaurant.Application.Menu;

/// <summary>
/// A dish resolved for a specific service date: what it costs today and how many are left.
/// Used by <c>OrderService</c> to price orders, so the cart and the kitchen agree.
/// </summary>
public record SellableMenuItem(
    int MenuItemId,
    string Name,
    decimal Price,
    int? DailyMenuItemId,
    int? RemainingQuantity,
    bool IsSoldOut);

public interface IMenuService
{
    /// <summary>The customer-facing menu for a date: everyday dishes plus that day's specials.</summary>
    Task<PagedResult<CustomerMenuItemDto>> BrowseAsync(CustomerMenuQuery query, CancellationToken ct = default);

    Task<CustomerMenuItemDto> GetItemAsync(int menuItemId, DateOnly? date, CancellationToken ct = default);

    /// <summary>
    /// Resolves the requested dishes against a service date. Dishes that are not on the menu
    /// that day are simply absent from the result, which is how the caller detects them.
    /// </summary>
    Task<IReadOnlyDictionary<int, SellableMenuItem>> GetSellableAsync(
        DateOnly date, IReadOnlyCollection<int> menuItemIds, CancellationToken ct = default);
}
