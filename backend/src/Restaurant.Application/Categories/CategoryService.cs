using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Categories.Dtos;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Domain.Entities;

namespace Restaurant.Application.Categories;

public partial class CategoryService(IApplicationDbContext db) : ICategoryService
{
    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default)
    {
        var query = db.Categories.AsNoTracking();

        if (!includeInactive)
            query = query.Where(c => c.IsActive);

        return await query
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .Select(c => new CategoryDto(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.ImageUrl,
                c.DisplayOrder,
                c.IsActive,
                c.MenuItems.Count(m => !m.IsDeleted)))
            .ToListAsync(ct);
    }

    public async Task<CategoryDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var category = await db.Categories
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new CategoryDto(
                c.Id, c.Name, c.Slug, c.Description, c.ImageUrl, c.DisplayOrder, c.IsActive,
                c.MenuItems.Count(m => !m.IsDeleted)))
            .FirstOrDefaultAsync(ct);

        return category ?? throw NotFoundException.For("Category", id);
    }

    public async Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, null, ct);

        var category = new Category
        {
            Name = name,
            Slug = await GenerateUniqueSlugAsync(name, null, ct),
            Description = Trimmed(request.Description),
            ImageUrl = Trimmed(request.ImageUrl),
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(category.Id, ct);
    }

    public async Task<CategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct)
                       ?? throw NotFoundException.For("Category", id);

        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, id, ct);

        if (!string.Equals(category.Name, name, StringComparison.OrdinalIgnoreCase))
            category.Slug = await GenerateUniqueSlugAsync(name, id, ct);

        category.Name = name;
        category.Description = Trimmed(request.Description);
        category.ImageUrl = Trimmed(request.ImageUrl);
        category.DisplayOrder = request.DisplayOrder;
        category.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct)
                       ?? throw NotFoundException.For("Category", id);

        // Deleting a category with live dishes would orphan them, so we require the admin
        // to move or archive the dishes first rather than silently cascading.
        var itemCount = await db.MenuItems.CountAsync(m => m.CategoryId == id && !m.IsDeleted, ct);
        if (itemCount > 0)
            throw new ConflictException(
                $"'{category.Name}' still has {itemCount} menu item(s). Move or delete them first.");

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureNameIsUniqueAsync(string name, int? excludingId, CancellationToken ct)
    {
        var exists = await db.Categories
            .AnyAsync(c => c.Name == name && (excludingId == null || c.Id != excludingId), ct);

        if (exists)
            throw new ConflictException($"A category named '{name}' already exists.");
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, int? excludingId, CancellationToken ct)
    {
        var baseSlug = Slugify(name);
        var slug = baseSlug;
        var suffix = 2;

        while (await db.Categories.AnyAsync(
                   c => c.Slug == slug && (excludingId == null || c.Id != excludingId), ct))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    private static string Slugify(string value)
    {
        var slug = NonSlugCharacters().Replace(value.ToLowerInvariant(), "-").Trim('-');
        return string.IsNullOrEmpty(slug) ? "category" : slug;
    }

    private static string? Trimmed(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonSlugCharacters();
}
