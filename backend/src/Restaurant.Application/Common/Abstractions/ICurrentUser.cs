using Restaurant.Domain.Enums;

namespace Restaurant.Application.Common.Abstractions;

/// <summary>Read-only view of the caller, resolved from the validated JWT.</summary>
public interface ICurrentUser
{
    int? UserId { get; }

    string? Email { get; }

    UserRole? Role { get; }

    bool IsAuthenticated { get; }

    /// <summary>Throws instead of returning null, for the many places where an id is required.</summary>
    int RequireUserId();
}
