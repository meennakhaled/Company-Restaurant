using Restaurant.Domain.Entities;

namespace Restaurant.Application.Common.Abstractions;

public interface ITokenService
{
    /// <summary>Issues a short-lived signed access token carrying the user's id, email and role.</summary>
    (string Token, DateTime ExpiresAt) CreateAccessToken(User user);

    /// <summary>Cryptographically random opaque token; stored hashed-by-uniqueness in the database.</summary>
    string CreateRefreshToken();

    TimeSpan RefreshTokenLifetime { get; }
}
