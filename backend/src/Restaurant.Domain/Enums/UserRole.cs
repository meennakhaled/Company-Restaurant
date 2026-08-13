namespace Restaurant.Domain.Enums;

/// <summary>
/// Roles are a small, fixed set that the code branches on directly, so they are
/// modelled as an enum column rather than a Roles lookup table. That keeps every
/// user query join-free while still being a real constrained column in SQL Server
/// (see the CHECK constraint in UserConfiguration).
/// </summary>
public enum UserRole
{
    Customer = 1,
    Staff = 2,
    Admin = 3
}
