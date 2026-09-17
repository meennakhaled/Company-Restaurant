using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Dashboard.Dtos;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Dashboard;

/// <summary>
/// Read-only analytics for the admin dashboard. Every figure is aggregated in SQL Server —
/// no order rows are pulled into memory to be summed.
///
/// Cancelled orders are excluded from all revenue figures but still counted as orders,
/// which is how a restaurant would actually read these numbers.
/// </summary>
public class DashboardService(IApplicationDbContext db, IClock clock) : IDashboardService
{
    private const int MaxTrendDays = 90;

    public async Task<DashboardOverviewDto> GetOverviewAsync(int days, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 7, MaxTrendDays);

        var today = clock.Today;
        var todayStart = today.ToDateTime(TimeOnly.MinValue);
        var tomorrowStart = today.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var yesterdayStart = today.AddDays(-1).ToDateTime(TimeOnly.MinValue);
        var trendStart = today.AddDays(-(days - 1)).ToDateTime(TimeOnly.MinValue);

        var stats = await BuildStatsAsync(todayStart, tomorrowStart, yesterdayStart, today, ct);
        var revenueSeries = await BuildRevenueSeriesAsync(trendStart, tomorrowStart, today, days, ct);
        var ordersByStatus = await BuildOrdersByStatusAsync(trendStart, ct);
        var topItems = await BuildTopItemsAsync(trendStart, ct);
        var categorySales = await BuildCategorySalesAsync(trendStart, ct);

        return new DashboardOverviewDto(stats, revenueSeries, ordersByStatus, topItems, categorySales);
    }

    private async Task<DashboardStatsDto> BuildStatsAsync(
        DateTime todayStart, DateTime tomorrowStart, DateTime yesterdayStart, DateOnly today, CancellationToken ct)
    {
        // Today and yesterday in a single grouped query rather than two round trips.
        var dayBuckets = await db.Orders
            .AsNoTracking()
            .Where(o => o.PlacedAt >= yesterdayStart && o.PlacedAt < tomorrowStart)
            .GroupBy(o => o.PlacedAt >= todayStart)
            .Select(g => new
            {
                IsToday = g.Key,
                OrderCount = g.Count(),
                Revenue = g.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.TotalAmount) ?? 0m,
                Completed = g.Count(o => o.Status == OrderStatus.Completed)
            })
            .ToListAsync(ct);

        var todayBucket = dayBuckets.FirstOrDefault(b => b.IsToday);
        var yesterdayBucket = dayBuckets.FirstOrDefault(b => !b.IsToday);

        var ordersToday = todayBucket?.OrderCount ?? 0;
        var revenueToday = todayBucket?.Revenue ?? 0m;
        var completedToday = todayBucket?.Completed ?? 0;

        var pendingOrders = await db.Orders.CountAsync(
            o => o.Status == OrderStatus.New || o.Status == OrderStatus.Preparing || o.Status == OrderStatus.Ready, ct);

        var activeMenuItems = await db.MenuItems.CountAsync(m => !m.IsDeleted && m.IsAvailable, ct);
        var itemsOnTodaysMenu = await db.DailyMenuItems.CountAsync(d => d.MenuDate == today, ct);
        var totalCustomers = await db.Users.CountAsync(u => u.Role == UserRole.Customer, ct);

        // Revenue-bearing orders only, so a day of cancellations doesn't drag the average down.
        var payingOrdersToday = await db.Orders.CountAsync(
            o => o.PlacedAt >= todayStart && o.PlacedAt < tomorrowStart && o.Status != OrderStatus.Cancelled, ct);

        var averageOrderValue = payingOrdersToday == 0
            ? 0m
            : Math.Round(revenueToday / payingOrdersToday, 2, MidpointRounding.AwayFromZero);

        return new DashboardStatsDto(
            ordersToday,
            revenueToday,
            pendingOrders,
            completedToday,
            activeMenuItems,
            itemsOnTodaysMenu,
            averageOrderValue,
            totalCustomers,
            PercentChange(revenueToday, yesterdayBucket?.Revenue ?? 0m),
            (int)PercentChange(ordersToday, yesterdayBucket?.OrderCount ?? 0));
    }

    private async Task<IReadOnlyList<RevenuePointDto>> BuildRevenueSeriesAsync(
        DateTime trendStart, DateTime tomorrowStart, DateOnly today, int days, CancellationToken ct)
    {
        var grouped = await db.Orders
            .AsNoTracking()
            .Where(o => o.PlacedAt >= trendStart && o.PlacedAt < tomorrowStart)
            .GroupBy(o => DateOnly.FromDateTime(o.PlacedAt))
            .Select(g => new
            {
                Date = g.Key,
                Revenue = g.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.TotalAmount) ?? 0m,
                OrderCount = g.Count()
            })
            .ToListAsync(ct);

        var byDate = grouped.ToDictionary(g => g.Date);

        // Days with no orders must still appear, otherwise the chart silently compresses gaps.
        return Enumerable.Range(0, days)
            .Select(offset =>
            {
                var date = today.AddDays(-(days - 1 - offset));
                return byDate.TryGetValue(date, out var row)
                    ? new RevenuePointDto(date, row.Revenue, row.OrderCount)
                    : new RevenuePointDto(date, 0m, 0);
            })
            .ToList();
    }

    private async Task<IReadOnlyList<OrdersByStatusDto>> BuildOrdersByStatusAsync(
        DateTime trendStart, CancellationToken ct)
    {
        var grouped = await db.Orders
            .AsNoTracking()
            .Where(o => o.PlacedAt >= trendStart)
            .GroupBy(o => o.Status)
            .Select(g => new OrdersByStatusDto(
                g.Key,
                g.Count(),
                g.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.TotalAmount) ?? 0m))
            .ToListAsync(ct);

        var byStatus = grouped.ToDictionary(g => g.Status);

        return Enum.GetValues<OrderStatus>()
            .Select(status => byStatus.TryGetValue(status, out var row) ? row : new OrdersByStatusDto(status, 0, 0m))
            .ToList();
    }

    private async Task<IReadOnlyList<TopMenuItemDto>> BuildTopItemsAsync(DateTime trendStart, CancellationToken ct) =>
        await db.OrderItems
            .AsNoTracking()
            .Where(i => i.Order.PlacedAt >= trendStart && i.Order.Status != OrderStatus.Cancelled)
            .GroupBy(i => new { i.MenuItemId, i.MenuItem.Name, i.MenuItem.ImageUrl, CategoryName = i.MenuItem.Category.Name })
            // Ordered and limited before projecting so SQL Server does the ranking, not the client.
            .OrderByDescending(g => g.Sum(i => i.Quantity))
            .Take(8)
            .Select(g => new TopMenuItemDto(
                g.Key.MenuItemId,
                g.Key.Name,
                g.Key.ImageUrl,
                g.Key.CategoryName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.LineTotal)))
            .ToListAsync(ct);

    private async Task<IReadOnlyList<CategorySalesDto>> BuildCategorySalesAsync(
        DateTime trendStart, CancellationToken ct) =>
        await db.OrderItems
            .AsNoTracking()
            .Where(i => i.Order.PlacedAt >= trendStart && i.Order.Status != OrderStatus.Cancelled)
            .GroupBy(i => i.MenuItem.Category.Name)
            .OrderByDescending(g => g.Sum(i => i.LineTotal))
            .Select(g => new CategorySalesDto(g.Key, g.Sum(i => i.Quantity), g.Sum(i => i.LineTotal)))
            .ToListAsync(ct);

    /// <summary>Growth vs. the previous period. A jump from zero is reported as +100%, not infinity.</summary>
    private static decimal PercentChange(decimal current, decimal previous)
    {
        if (previous == 0)
            return current == 0 ? 0 : 100;

        return Math.Round((current - previous) / previous * 100, 1, MidpointRounding.AwayFromZero);
    }
}
