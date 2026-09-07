using Restaurant.Application.Dashboard.Dtos;

namespace Restaurant.Application.Dashboard;

public interface IDashboardService
{
    /// <summary>
    /// Everything the admin dashboard renders, in one call.
    /// <paramref name="days"/> controls the length of the revenue/orders trend window.
    /// </summary>
    Task<DashboardOverviewDto> GetOverviewAsync(int days, CancellationToken ct = default);
}
