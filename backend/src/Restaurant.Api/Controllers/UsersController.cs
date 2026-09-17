using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Users;
using Restaurant.Application.Users.Dtos;

namespace Restaurant.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = Roles.Admin)]
public class UsersController(IUserService userService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<UserListItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<UserListItemDto>>> Search(
        [FromQuery] UserQuery query, CancellationToken ct) =>
        Ok(await userService.SearchAsync(query, ct));

    [HttpGet("{id:int}")]
    [ProducesResponseType<UserListItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserListItemDto>> GetById(int id, CancellationToken ct) =>
        Ok(await userService.GetByIdAsync(id, ct));

    /// <summary>Creates a staff or admin account. Customers register themselves.</summary>
    [HttpPost("staff")]
    [ProducesResponseType<UserListItemDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserListItemDto>> CreateStaff(CreateStaffRequest request, CancellationToken ct)
    {
        var user = await userService.CreateStaffAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPatch("{id:int}/role")]
    [ProducesResponseType<UserListItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserListItemDto>> UpdateRole(
        int id, UpdateUserRoleRequest request, CancellationToken ct) =>
        Ok(await userService.UpdateRoleAsync(id, request, ct));

    /// <summary>Deactivating an account revokes its live sessions immediately.</summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType<UserListItemDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserListItemDto>> UpdateStatus(
        int id, UpdateUserStatusRequest request, CancellationToken ct) =>
        Ok(await userService.UpdateStatusAsync(id, request, ct));
}
