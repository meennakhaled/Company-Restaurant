using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Restaurant.Application.Auth;
using Restaurant.Application.Categories;
using Restaurant.Application.DailyMenus;
using Restaurant.Application.Dashboard;
using Restaurant.Application.Menu;
using Restaurant.Application.MenuItems;
using Restaurant.Application.Orders;
using Restaurant.Application.Users;

namespace Restaurant.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers the business layer. Services are scoped because they share the request's
    /// DbContext and the resolved current user.
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IMenuItemService, MenuItemService>();
        services.AddScoped<IMenuService, MenuService>();
        services.AddScoped<IDailyMenuService, DailyMenuService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDashboardService, DashboardService>();

        services.AddValidatorsFromAssemblyContaining<AuthService>(ServiceLifetime.Scoped);

        return services;
    }
}
