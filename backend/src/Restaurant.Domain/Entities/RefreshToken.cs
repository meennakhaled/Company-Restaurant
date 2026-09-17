namespace Restaurant.Domain.Entities;

/// <summary>
/// Lets access tokens stay short-lived (15 min) without forcing users to log in again.
/// Tokens are rotated on every refresh, so a stolen token is usable at most once.
/// </summary>
public class RefreshToken
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
