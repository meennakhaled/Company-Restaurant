using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Dashboard;
using Restaurant.Application.Dashboard.Dtos;

namespace Restaurant.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = Roles.Admin)]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    /// <summary>
    /// Stats, trend series, status split and best sellers in one response — the dashboard
    /// renders from a single request rather than five racing ones.
    /// </summary>
    [HttpGet("overview")]
    [ProducesResponseType<DashboardOverviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardOverviewDto>> GetOverview(
        [FromQuery] int days, CancellationToken ct) =>
        Ok(await dashboardService.GetOverviewAsync(days == 0 ? 14 : days, ct));
}
