using Restaurant.Domain.Enums;

namespace Restaurant.Application.Auth.Dtos;

public record RegisterRequest(
    string FullName,
    string Email,
    string Password,
    string? PhoneNumber);

public record LoginRequest(string Email, string Password);

public record RefreshTokenRequest(string RefreshToken);

public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    UserProfileDto User);

public record UserProfileDto(
    int Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    UserRole Role,
    bool IsActive,
    DateTime CreatedAt);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UpdateProfileRequest(string FullName, string? PhoneNumber);
