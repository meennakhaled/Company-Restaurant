using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.DailyMenus;
using Restaurant.Application.DailyMenus.Dtos;

namespace Restaurant.Api.Controllers;

/// <summary>
/// The daily menu planner. Chefs plan the kitchen's day, so Staff has full access here —
/// this is their tool, not an administrative one.
/// </summary>
[ApiController]
[Route("api/daily-menus")]
[Authorize(Roles = Roles.StaffOrAdmin)]
public class DailyMenusController(IDailyMenuService dailyMenuService, IClock clock) : ControllerBase
{
    /// <summary>The plan for one service date. Defaults to today when no date is given.</summary>
    [HttpGet]
    [ProducesResponseType<DailyMenuDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DailyMenuDto>> GetForDate(
        [FromQuery] DateOnly? date, CancellationToken ct) =>
        Ok(await dailyMenuService.GetForDateAsync(date ?? clock.Today, ct));

    /// <summary>Per-day dish counts for the planner's calendar view.</summary>
    [HttpGet("calendar")]
    [ProducesResponseType<IReadOnlyList<DailyMenuCalendarDayDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DailyMenuCalendarDayDto>>> GetCalendar(
        [FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) =>
        Ok(await dailyMenuService.GetCalendarAsync(from, to, ct));

    [HttpPost]
    [ProducesResponseType<DailyMenuItemDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DailyMenuItemDto>> AddItem(
        [FromQuery] DateOnly date, AddDailyMenuItemRequest request, CancellationToken ct)
    {
        var entry = await dailyMenuService.AddItemAsync(date, request, ct);
        return CreatedAtAction(nameof(GetForDate), new { date = entry.MenuDate }, entry);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<DailyMenuItemDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DailyMenuItemDto>> UpdateItem(
        int id, UpdateDailyMenuItemRequest request, CancellationToken ct) =>
        Ok(await dailyMenuService.UpdateItemAsync(id, request, ct));

    /// <summary>Pulls a dish mid-service without losing what has already been sold.</summary>
    [HttpPatch("{id:int}/sold-out")]
    [ProducesResponseType<DailyMenuItemDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DailyMenuItemDto>> SetSoldOut(
        int id, [FromBody] SetSoldOutRequest request, CancellationToken ct) =>
        Ok(await dailyMenuService.SetSoldOutAsync(id, request.IsSoldOut, ct));

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RemoveItem(int id, CancellationToken ct)
    {
        await dailyMenuService.RemoveItemAsync(id, ct);
        return NoContent();
    }

    /// <summary>
    /// Fills the day with every everyday staple that isn't on it yet. Nothing reaches the
    /// customer menu unplanned, so this keeps that rule from becoming daily busywork.
    /// </summary>
    [HttpPost("staples")]
    [ProducesResponseType<AddStaplesResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AddStaplesResponse>> AddStaples(
        [FromQuery] DateOnly date, CancellationToken ct)
    {
        var added = await dailyMenuService.AddStaplesAsync(date, ct);
        return Ok(new AddStaplesResponse(added));
    }

    /// <summary>Duplicates a planned day onto other dates ("same as last Friday").</summary>
    [HttpPost("copy")]
    [ProducesResponseType<CopyDailyMenuResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CopyDailyMenuResponse>> Copy(
        CopyDailyMenuRequest request, CancellationToken ct)
    {
        var copied = await dailyMenuService.CopyAsync(request, ct);
        return Ok(new CopyDailyMenuResponse(copied));
    }
}

public record SetSoldOutRequest(bool IsSoldOut);

public record CopyDailyMenuResponse(int CopiedCount);

public record AddStaplesResponse(int AddedCount);
