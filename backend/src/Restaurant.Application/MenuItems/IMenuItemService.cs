using Restaurant.Application.Common.Models;
using Restaurant.Application.MenuItems.Dtos;

namespace Restaurant.Application.MenuItems;

public interface IMenuItemService
{
    Task<PagedResult<MenuItemDto>> SearchAsync(MenuItemQuery query, CancellationToken ct = default);

    Task<MenuItemDto> GetByIdAsync(int id, CancellationToken ct = default);

    Task<MenuItemDto> CreateAsync(SaveMenuItemRequest request, CancellationToken ct = default);

    Task<MenuItemDto> UpdateAsync(int id, SaveMenuItemRequest request, CancellationToken ct = default);

    Task<MenuItemDto> SetAvailabilityAsync(int id, bool isAvailable, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}
