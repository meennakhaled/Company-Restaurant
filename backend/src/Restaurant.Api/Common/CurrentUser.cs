using System.Security.Claims;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Exceptions;
using Restaurant.Domain.Enums;

namespace Restaurant.Api.Common;

/// <summary>
/// Reads the caller's identity from the validated JWT. Nothing here trusts request bodies or
/// headers — every value comes from claims the server itself signed.
/// </summary>
public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public int? UserId =>
        int.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string? Email => Principal?.FindFirstValue(ClaimTypes.Email);

    public UserRole? Role =>
        Enum.TryParse<UserRole>(Principal?.FindFirstValue(ClaimTypes.Role), out var role) ? role : null;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public int RequireUserId() =>
        UserId ?? throw new AuthenticationException("You must be signed in to do that.");
}
