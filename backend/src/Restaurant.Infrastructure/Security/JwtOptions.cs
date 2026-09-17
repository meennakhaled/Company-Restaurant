namespace Restaurant.Infrastructure.Security;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "RestaurantApi";

    public string Audience { get; set; } = "RestaurantClient";

    /// <summary>
    /// HMAC signing key. Must be at least 32 bytes and must come from user-secrets or an
    /// environment variable in any real deployment — never from a committed appsettings file.
    /// </summary>
    public string SigningKey { get; set; } = string.Empty;

    /// <summary>Short by design: a leaked access token expires quickly, and refresh tokens cover the gap.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    public int RefreshTokenDays { get; set; } = 7;
}
