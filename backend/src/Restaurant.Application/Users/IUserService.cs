using Restaurant.Application.Common.Models;
using Restaurant.Application.Users.Dtos;

namespace Restaurant.Application.Users;

public interface IUserService
{
    Task<PagedResult<UserListItemDto>> SearchAsync(UserQuery query, CancellationToken ct = default);

    Task<UserListItemDto> GetByIdAsync(int id, CancellationToken ct = default);

    /// <summary>Admin-only creation of staff and admin accounts (self-registration is customer-only).</summary>
    Task<UserListItemDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct = default);

    Task<UserListItemDto> UpdateRoleAsync(int id, UpdateUserRoleRequest request, CancellationToken ct = default);

    Task<UserListItemDto> UpdateStatusAsync(int id, UpdateUserStatusRequest request, CancellationToken ct = default);
}
