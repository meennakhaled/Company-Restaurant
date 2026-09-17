using Restaurant.Domain.Enums;

namespace Restaurant.Application.Dashboard.Dtos;

/// <summary>Headline numbers for the admin dashboard, with a comparison against yesterday.</summary>
public record DashboardStatsDto(
    int OrdersToday,
    decimal RevenueToday,
    int PendingOrders,
    int CompletedOrdersToday,
    int ActiveMenuItems,
    int ItemsOnTodaysMenu,
    decimal AverageOrderValueToday,
    int TotalCustomers,
    decimal RevenueChangePercent,
    int OrdersChangePercent);

public record RevenuePointDto(DateOnly Date, decimal Revenue, int OrderCount);

public record OrdersByStatusDto(OrderStatus Status, int Count, decimal Revenue);

public record TopMenuItemDto(
    int MenuItemId,
    string Name,
    string? ImageUrl,
    string CategoryName,
    int QuantitySold,
    decimal Revenue);

public record CategorySalesDto(string CategoryName, int QuantitySold, decimal Revenue);

/// <summary>Everything the dashboard needs in one round trip.</summary>
public record DashboardOverviewDto(
    DashboardStatsDto Stats,
    IReadOnlyList<RevenuePointDto> RevenueSeries,
    IReadOnlyList<OrdersByStatusDto> OrdersByStatus,
    IReadOnlyList<TopMenuItemDto> TopItems,
    IReadOnlyList<CategorySalesDto> CategorySales);
