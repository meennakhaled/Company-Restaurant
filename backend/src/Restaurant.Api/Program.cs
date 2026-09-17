using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Restaurant.Api.Common;
using Restaurant.Api.Hubs;
using Restaurant.Api.Middleware;
using Restaurant.Application;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Infrastructure;
using Restaurant.Infrastructure.Persistence;
using Restaurant.Infrastructure.Persistence.Seed;
using Restaurant.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "RestaurantClient";

// ── Services ────────────────────────────────────────────────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddApplication();

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();
builder.Services.AddScoped<IOrderNotifier, SignalROrderNotifier>();

builder.Services
    .AddControllers(options => options.Filters.Add<ValidationFilter>())
    .AddJsonOptions(options =>
    {
        // Enums travel as their names ("Preparing"), which keeps the API readable and means
        // the React client never hard-codes numeric status values.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// FluentValidation runs through ValidationFilter, so MVC's own model-state pipeline is
// silenced to avoid two different error shapes for the same failure.
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(
    options => options.SuppressModelStateInvalidFilter = true);

builder.Services.AddSignalR();

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                 ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.SigningKey) || jwtOptions.SigningKey.Length < 32)
{
    // Failing at startup is better than silently signing tokens with a weak or empty key.
    throw new InvalidOperationException(
        "Jwt:SigningKey must be configured and at least 32 characters. " +
        "Set it via user-secrets or the Jwt__SigningKey environment variable.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            // No grace period on expiry — a 15-minute token should mean 15 minutes.
            ClockSkew = TimeSpan.Zero
        };

        // Browsers cannot set an Authorization header on a websocket handshake, so SignalR
        // passes the token as a query string parameter. Accept it for hub routes only.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];

                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                         ?? ["http://localhost:5173"];

    policy.WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        // Required for the SignalR websocket handshake.
        .AllowCredentials();
}));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Restaurant Management API",
        Version = "v1",
        Description = "Menu, daily menu planning, ordering and kitchen operations."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the access token returned by /api/auth/login."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

var app = builder.Build();

// ── Pipeline ────────────────────────────────────────────────────────────────────
// First in the pipeline so it catches failures from everything after it.
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "Restaurant API v1"));
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OrdersHub>("/hubs/orders");
app.MapGet("/health", () => Results.Ok(new { status = "healthy" })).AllowAnonymous();

await ApplyMigrationsAndSeedAsync(app);

app.Run();

/// <summary>
/// Applies pending migrations and seeds demo data on startup. Convenient for a portfolio
/// project and for local development; a production deployment would run migrations as a
/// separate, controlled step instead.
/// </summary>
static async Task ApplyMigrationsAndSeedAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        var db = scope.ServiceProvider.GetRequiredService<RestaurantDbContext>();
        await db.Database.MigrateAsync();

        if (app.Configuration.GetValue("SeedDemoData", true))
        {
            var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
            await seeder.SeedAsync();
        }

        logger.LogInformation("Database is ready");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialisation failed");
        throw;
    }
}

/// <summary>Exposed so integration tests can reference the entry point assembly.</summary>
public partial class Program;
