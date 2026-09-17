using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Categories;
using Restaurant.Application.Categories.Dtos;

namespace Restaurant.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController(ICategoryService categoryService) : ControllerBase
{
    /// <summary>
    /// Public menu navigation. Inactive categories are only returned to an admin, so a
    /// hidden category cannot be discovered by passing includeInactive=true anonymously.
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<IReadOnlyList<CategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(
        [FromQuery] bool includeInactive, CancellationToken ct)
    {
        var canSeeInactive = includeInactive && User.IsInRole(Roles.Admin);
        return Ok(await categoryService.GetAllAsync(canSeeInactive, ct));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryDto>> GetById(int id, CancellationToken ct) =>
        Ok(await categoryService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<CategoryDto>> Create(SaveCategoryRequest request, CancellationToken ct)
    {
        var category = await categoryService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType<CategoryDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoryDto>> Update(
        int id, SaveCategoryRequest request, CancellationToken ct) =>
        Ok(await categoryService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await categoryService.DeleteAsync(id, ct);
        return NoContent();
    }
}
