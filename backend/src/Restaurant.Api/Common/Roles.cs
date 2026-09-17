namespace Restaurant.Api.Common;

/// <summary>
/// Role names as used by [Authorize(Roles = ...)]. Constants rather than magic strings so a
/// typo becomes a compile error instead of a silently open endpoint.
/// </summary>
public static class Roles
{
    public const string Customer = nameof(Domain.Enums.UserRole.Customer);
    public const string Staff = nameof(Domain.Enums.UserRole.Staff);
    public const string Admin = nameof(Domain.Enums.UserRole.Admin);

    /// <summary>Kitchen operations: staff run them day to day, admins can always step in.</summary>
    public const string StaffOrAdmin = $"{Staff},{Admin}";
}
