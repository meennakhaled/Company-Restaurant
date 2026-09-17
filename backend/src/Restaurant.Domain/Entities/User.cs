using Restaurant.Domain.Common;
using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Entities;

public class User : AuditableEntity
{
    public string FullName { get; set; } = string.Empty;

    /// <summary>Stored lower-cased; a unique index enforces one account per address.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>PBKDF2 hash in the format produced by <c>IPasswordHasher</c>. Never a plain password.</summary>
    public string PasswordHash { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public UserRole Role { get; set; } = UserRole.Customer;

    /// <summary>Deactivated users keep their order history but can no longer authenticate.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime? LastLoginAt { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
