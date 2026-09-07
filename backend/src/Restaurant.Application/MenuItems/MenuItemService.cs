using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Application.Common.Models;
using Restaurant.Application.MenuItems.Dtos;
using Restaurant.Domain.Entities;

namespace Restaurant.Application.MenuItems;

public class MenuItemService(IApplicationDbContext db, IClock clock) : IMenuItemService
{
    public async Task<PagedResult<MenuItemDto>> SearchAsync(MenuItemQuery query, CancellationToken ct = default)
    {
        var items = db.MenuItems.AsNoTracking().Where(m => !m.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            items = items.Where(m =>
                EF.Functions.Like(m.Name, $"%{term}%") ||
                (m.Description != null && EF.Functions.Like(m.Description, $"%{term}%")));
        }

        if (query.CategoryId is { } categoryId)
            items = items.Where(m => m.CategoryId == categoryId);

        if (query.IsAvailable is { } isAvailable)
            items = items.Where(m => m.IsAvailable == isAvailable);

        if (query.Availability is { } availability)
            items = items.Where(m => m.Availability == availability);

        if (query.MinPrice is { } minPrice)
            items = items.Where(m => m.Price >= minPrice);

        if (query.MaxPrice is { } maxPrice)
            items = items.Where(m => m.Price <= maxPrice);

        items = ApplySort(items, query.SortBy, query.SortDescending);

        return await items.Select(Projection).ToPagedResultAsync(query.Page, query.PageSize, ct);
    }

    public async Task<MenuItemDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var item = await db.MenuItems
            .AsNoTracking()
            .Where(m => m.Id == id && !m.IsDeleted)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

        return item ?? throw NotFoundException.For("Menu item", id);
    }

    public async Task<MenuItemDto> CreateAsync(SaveMenuItemRequest request, CancellationToken ct = default)
    {
        await EnsureCategoryExistsAsync(request.CategoryId, ct);
        await EnsureNameIsUniqueAsync(request.Name.Trim(), null, ct);

        var item = new MenuItem
        {
            Name = request.Name.Trim(),
            Description = Trimmed(request.Description),
            Price = request.Price,
            ImageUrl = Trimmed(request.ImageUrl),
            CategoryId = request.CategoryId,
            IsAvailable = request.IsAvailable,
            Availability = request.Availability,
            PreparationMinutes = request.PreparationMinutes,
            IsVegetarian = request.IsVegetarian,
            IsSpicy = request.IsSpicy
        };

        db.MenuItems.Add(item);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(item.Id, ct);
    }

    public async Task<MenuItemDto> UpdateAsync(int id, SaveMenuItemRequest request, CancellationToken ct = default)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, ct)
                   ?? throw NotFoundException.For("Menu item", id);

        await EnsureCategoryExistsAsync(request.CategoryId, ct);
        await EnsureNameIsUniqueAsync(request.Name.Trim(), id, ct);

        item.Name = request.Name.Trim();
        item.Description = Trimmed(request.Description);
        item.Price = request.Price;
        item.ImageUrl = Trimmed(request.ImageUrl);
        item.CategoryId = request.CategoryId;
        item.IsAvailable = request.IsAvailable;
        item.Availability = request.Availability;
        item.PreparationMinutes = request.PreparationMinutes;
        item.IsVegetarian = request.IsVegetarian;
        item.IsSpicy = request.IsSpicy;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<MenuItemDto> SetAvailabilityAsync(int id, bool isAvailable, CancellationToken ct = default)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, ct)
                   ?? throw NotFoundException.For("Menu item", id);

        item.IsAvailable = isAvailable;
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, ct)
                   ?? throw NotFoundException.For("Menu item", id);

        // Soft delete: past orders reference this row, so removing it would corrupt history
        // and revenue reporting. The item simply disappears from every menu and admin list.
        item.IsDeleted = true;
        item.IsAvailable = false;

        // Also pull it from any future day it was scheduled on, so the planner stays honest.
        var futureSchedules = await db.DailyMenuItems
            .Where(d => d.MenuItemId == id && d.MenuDate >= clock.Today)
            .ToListAsync(ct);
        db.DailyMenuItems.RemoveRange(futureSchedules);

        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken ct)
    {
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId, ct))
            throw new ValidationException(nameof(SaveMenuItemRequest.CategoryId), "The selected category does not exist.");
    }

    private async Task EnsureNameIsUniqueAsync(string name, int? excludingId, CancellationToken ct)
    {
        var exists = await db.MenuItems
            .AnyAsync(m => !m.IsDeleted && m.Name == name && (excludingId == null || m.Id != excludingId), ct);

        if (exists)
            throw new ConflictException($"A menu item named '{name}' already exists.");
    }

    private static IQueryable<MenuItem> ApplySort(IQueryable<MenuItem> query, string? sortBy, bool descending) =>
        // Sort keys are whitelisted rather than interpolated into SQL.
        (sortBy?.ToLowerInvariant()) switch
        {
            "price" => descending ? query.OrderByDescending(m => m.Price) : query.OrderBy(m => m.Price),
            "category" => descending
                ? query.OrderByDescending(m => m.Category.Name).ThenBy(m => m.Name)
                : query.OrderBy(m => m.Category.Name).ThenBy(m => m.Name),
            "createdat" => descending ? query.OrderByDescending(m => m.CreatedAt) : query.OrderBy(m => m.CreatedAt),
            "name" => descending ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
            _ => query.OrderBy(m => m.Category.DisplayOrder).ThenBy(m => m.Name)
        };

    private static string? Trimmed(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static System.Linq.Expressions.Expression<Func<MenuItem, MenuItemDto>> Projection =>
        m => new MenuItemDto(
            m.Id,
            m.Name,
            m.Description,
            m.Price,
            m.ImageUrl,
            m.CategoryId,
            m.Category.Name,
            m.IsAvailable,
            m.Availability,
            m.PreparationMinutes,
            m.IsVegetarian,
            m.IsSpicy,
            m.CreatedAt);
}
