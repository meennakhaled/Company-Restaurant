using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Auth.Dtos;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Domain.Entities;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Auth;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    ICurrentUser currentUser,
    IClock clock) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == email, ct))
            throw new ConflictException("An account with this email address already exists.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            // Self-registration always creates a customer. Staff and admin accounts are
            // created by an existing admin, so the public endpoint cannot escalate privileges.
            Role = UserRole.Customer,
            IsActive = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Same message for "no such user" and "wrong password" so the endpoint cannot be
        // used to discover which email addresses are registered.
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new AuthenticationException("Invalid email or password.");

        if (!user.IsActive)
            throw new ForbiddenException("This account has been deactivated. Please contact the restaurant.");

        user.LastLoginAt = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var stored = await db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, ct);

        if (stored is null || !stored.IsActive)
            throw new AuthenticationException("Invalid or expired refresh token.");

        if (!stored.User.IsActive)
            throw new ForbiddenException("This account has been deactivated.");

        // Rotate: the presented token is burned and replaced, so it cannot be replayed.
        stored.RevokedAt = clock.UtcNow;

        return await IssueTokensAsync(stored.User, ct);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken ct = default)
    {
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == refreshToken, ct);
        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = clock.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<UserProfileDto> GetCurrentUserAsync(CancellationToken ct = default)
    {
        var user = await LoadCurrentUserAsync(ct);
        return ToProfile(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await LoadCurrentUserAsync(ct);

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();

        await db.SaveChangesAsync(ct);
        return ToProfile(user);
    }

    public async Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await LoadCurrentUserAsync(ct);

        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationException(nameof(request.CurrentPassword), "Current password is incorrect.");

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);

        // Changing a password invalidates every other session.
        var sessions = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var session in sessions)
            session.RevokedAt = clock.UtcNow;

        await db.SaveChangesAsync(ct);
    }

    private async Task<User> LoadCurrentUserAsync(CancellationToken ct)
    {
        var userId = currentUser.RequireUserId();
        return await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
               ?? throw new AuthenticationException("Your session is no longer valid. Please sign in again.");
    }

    private async Task<AuthResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = tokenService.CreateRefreshToken(),
            ExpiresAt = clock.UtcNow.Add(tokenService.RefreshTokenLifetime),
            CreatedAt = clock.UtcNow
        };

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync(ct);

        return new AuthResponse(accessToken, expiresAt, refreshToken.Token, ToProfile(user));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static UserProfileDto ToProfile(User user) => new(
        user.Id,
        user.FullName,
        user.Email,
        user.PhoneNumber,
        user.Role,
        user.IsActive,
        user.CreatedAt);
}
