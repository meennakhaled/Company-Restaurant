using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Settings;
using Restaurant.Infrastructure.Persistence;
using Restaurant.Infrastructure.Persistence.Seed;
using Restaurant.Infrastructure.Security;
using Restaurant.Infrastructure.Services;

namespace Restaurant.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RestaurantOptions>(configuration.GetSection(RestaurantOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddDbContext<RestaurantDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                // Retry-on-failure is deliberately not enabled: it is incompatible with the
                // explicit transaction used when placing an order, and would have to be driven
                // through an execution strategy at every call site to stay correct.
                sql => sql.MigrationsAssembly(typeof(RestaurantDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<RestaurantDbContext>());

        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<DatabaseSeeder>();

        return services;
    }
}
