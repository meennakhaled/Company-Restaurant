using Restaurant.Application.Common.Models;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Users.Dtos;

public record UserListItemDto(
    int Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    UserRole Role,
    bool IsActive,
    int OrderCount,
    decimal TotalSpent,
    DateTime? LastLoginAt,
    DateTime CreatedAt);

public record UpdateUserRoleRequest(UserRole Role);

public record UpdateUserStatusRequest(bool IsActive);

public record CreateStaffRequest(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber,
    UserRole Role);

public class UserQuery : QueryParameters
{
    public UserRole? Role { get; set; }

    public bool? IsActive { get; set; }
}
