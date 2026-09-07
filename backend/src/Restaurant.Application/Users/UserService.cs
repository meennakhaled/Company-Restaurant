using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Users.Dtos;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Users;

public class UserService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    ICurrentUser currentUser,
    IClock clock) : IUserService
{
    public async Task<PagedResult<UserListItemDto>> SearchAsync(UserQuery query, CancellationToken ct = default)
    {
        var users = db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            users = users.Where(u =>
                EF.Functions.Like(u.FullName, $"%{term}%") ||
                EF.Functions.Like(u.Email, $"%{term}%") ||
                (u.PhoneNumber != null && EF.Functions.Like(u.PhoneNumber, $"%{term}%")));
        }

        if (query.Role is { } role)
            users = users.Where(u => u.Role == role);

        if (query.IsActive is { } isActive)
            users = users.Where(u => u.IsActive == isActive);

        users = (query.SortBy?.ToLowerInvariant()) switch
        {
            "name" => query.SortDescending ? users.OrderByDescending(u => u.FullName) : users.OrderBy(u => u.FullName),
            "email" => query.SortDescending ? users.OrderByDescending(u => u.Email) : users.OrderBy(u => u.Email),
            "role" => query.SortDescending ? users.OrderByDescending(u => u.Role) : users.OrderBy(u => u.Role),
            "lastlogin" => query.SortDescending
                ? users.OrderByDescending(u => u.LastLoginAt)
                : users.OrderBy(u => u.LastLoginAt),
            _ => query.SortDescending ? users.OrderBy(u => u.CreatedAt) : users.OrderByDescending(u => u.CreatedAt)
        };

        return await users.Select(Projection).ToPagedResultAsync(query.Page, query.PageSize, ct);
    }

    public async Task<UserListItemDto> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().Where(u => u.Id == id).Select(Projection).FirstOrDefaultAsync(ct);
        return user ?? throw NotFoundException.For("User", id);
    }

    public async Task<UserListItemDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("An account with this email address already exists.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = request.Role,
            IsActive = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(user.Id, ct);
    }

    public async Task<UserListItemDto> UpdateRoleAsync(
        int id, UpdateUserRoleRequest request, CancellationToken ct = default)
    {
        var user = await LoadAsync(id, ct);

        // An admin demoting themselves would immediately lose access to this screen, and if they
        // were the last admin nobody could manage the restaurant again.
        if (user.Id == currentUser.UserId && request.Role != UserRole.Admin)
            throw new BusinessRuleException("You cannot change your own role.");

        if (user.Role == UserRole.Admin && request.Role != UserRole.Admin)
            await EnsureNotLastAdminAsync(user.Id, ct);

        user.Role = request.Role;
        await db.SaveChangesAsync(ct);

        return await GetByIdAsync(id, ct);
    }

    public async Task<UserListItemDto> UpdateStatusAsync(
        int id, UpdateUserStatusRequest request, CancellationToken ct = default)
    {
        var user = await LoadAsync(id, ct);

        if (user.Id == currentUser.UserId && !request.IsActive)
            throw new BusinessRuleException("You cannot deactivate your own account.");

        if (user.Role == UserRole.Admin && !request.IsActive)
            await EnsureNotLastAdminAsync(user.Id, ct);

        user.IsActive = request.IsActive;

        if (!request.IsActive)
        {
            // Revoke live sessions so deactivation takes effect immediately rather than
            // whenever the current access token happens to expire.
            var sessions = await db.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAt == null)
                .ToListAsync(ct);

            foreach (var session in sessions)
                session.RevokedAt = clock.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    private async Task EnsureNotLastAdminAsync(int excludingUserId, CancellationToken ct)
    {
        var remainingAdmins = await db.Users
            .CountAsync(u => u.Role == UserRole.Admin && u.IsActive && u.Id != excludingUserId, ct);

        if (remainingAdmins == 0)
            throw new BusinessRuleException("The restaurant must always have at least one active administrator.");
    }

    private async Task<User> LoadAsync(int id, CancellationToken ct) =>
        await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw NotFoundException.For("User", id);

    private static Expression<Func<User, UserListItemDto>> Projection =>
        u => new UserListItemDto(
            u.Id,
            u.FullName,
            u.Email,
            u.PhoneNumber,
            u.Role,
            u.IsActive,
            u.Orders.Count,
            // Cancelled orders are excluded so "total spent" reflects real revenue from this customer.
            u.Orders.Where(o => o.Status != OrderStatus.Cancelled).Sum(o => (decimal?)o.TotalAmount) ?? 0m,
            u.LastLoginAt,
            u.CreatedAt);
}
