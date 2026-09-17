using Restaurant.Application.Categories.Dtos;

namespace Restaurant.Application.Categories;

public interface ICategoryService
{
    /// <summary>Categories for the public menu; <paramref name="includeInactive"/> is admin-only.</summary>
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(bool includeInactive, CancellationToken ct = default);

    Task<CategoryDto> GetByIdAsync(int id, CancellationToken ct = default);

    Task<CategoryDto> CreateAsync(SaveCategoryRequest request, CancellationToken ct = default);

    Task<CategoryDto> UpdateAsync(int id, SaveCategoryRequest request, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}
