namespace Restaurant.Application.Categories.Dtos;

public record CategoryDto(
    int Id,
    string Name,
    string Slug,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive,
    int MenuItemCount);

public record SaveCategoryRequest(
    string Name,
    string? Description,
    string? ImageUrl,
    int DisplayOrder,
    bool IsActive);
