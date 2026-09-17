using Restaurant.Application.Auth.Dtos;

namespace Restaurant.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResponse> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default);

    Task LogoutAsync(string refreshToken, CancellationToken ct = default);

    Task<UserProfileDto> GetCurrentUserAsync(CancellationToken ct = default);

    Task<UserProfileDto> UpdateProfileAsync(UpdateProfileRequest request, CancellationToken ct = default);

    Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken ct = default);
}
