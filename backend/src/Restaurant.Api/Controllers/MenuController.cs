using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Menu;
using Restaurant.Application.Menu.Dtos;

namespace Restaurant.Api.Controllers;

/// <summary>
/// The customer-facing menu. Anonymous browsing is allowed on purpose — a restaurant's menu
/// is public, and requiring a login just to look at the food would cost real orders.
///
/// Customers may only view today's menu. Future dates are a planning concern and are served
/// by the staff-only daily-menu endpoints.
/// </summary>
[ApiController]
[Route("api/menu")]
[AllowAnonymous]
public class MenuController(IMenuService menuService, IClock clock) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<CustomerMenuItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerMenuItemDto>>> Browse(
        [FromQuery] CustomerMenuQuery query, CancellationToken ct)
    {
        query.Date = clock.Today;
        return Ok(await menuService.BrowseAsync(query, ct));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<CustomerMenuItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerMenuItemDto>> GetItem(int id, CancellationToken ct) =>
        Ok(await menuService.GetItemAsync(id, clock.Today, ct));

    /// <summary>Today's scheduled dishes only — what the home page features as "today's specials".</summary>
    [HttpGet("specials")]
    [ProducesResponseType<PagedResult<CustomerMenuItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<CustomerMenuItemDto>>> Specials(
        [FromQuery] int pageSize, CancellationToken ct)
    {
        var query = new CustomerMenuQuery
        {
            Date = clock.Today,
            OnlySpecials = true,
            OnlyAvailable = true,
            PageSize = pageSize <= 0 ? 8 : pageSize
        };

        return Ok(await menuService.BrowseAsync(query, ct));
    }
}
