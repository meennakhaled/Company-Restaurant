using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Common.Models;
using Restaurant.Application.MenuItems;
using Restaurant.Application.MenuItems.Dtos;

namespace Restaurant.Api.Controllers;

/// <summary>
/// The catalogue as management sees it — every dish, including hidden ones. Customers use
/// <c>/api/menu</c> instead, which resolves availability for the current service date.
/// </summary>
[ApiController]
[Route("api/menu-items")]
[Authorize(Roles = Roles.StaffOrAdmin)]
public class MenuItemsController(IMenuItemService menuItemService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<MenuItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MenuItemDto>>> Search(
        [FromQuery] MenuItemQuery query, CancellationToken ct) =>
        Ok(await menuItemService.SearchAsync(query, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<MenuItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MenuItemDto>> GetById(int id, CancellationToken ct) =>
        Ok(await menuItemService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType<MenuItemDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MenuItemDto>> Create(SaveMenuItemRequest request, CancellationToken ct)
    {
        var item = await menuItemService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType<MenuItemDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MenuItemDto>> Update(
        int id, SaveMenuItemRequest request, CancellationToken ct) =>
        Ok(await menuItemService.UpdateAsync(id, request, ct));

    /// <summary>
    /// Kitchen-facing switch to pull a dish off the menu immediately. Staff can use this
    /// (they know when they run out of an ingredient) even though they cannot edit prices.
    /// </summary>
    [HttpPatch("{id:int}/availability")]
    [ProducesResponseType<MenuItemDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MenuItemDto>> SetAvailability(
        int id, SetAvailabilityRequest request, CancellationToken ct) =>
        Ok(await menuItemService.SetAvailabilityAsync(id, request.IsAvailable, ct));

    /// <summary>Archives the dish. Historical orders keep referencing it.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await menuItemService.DeleteAsync(id, ct);
        return NoContent();
    }
}
