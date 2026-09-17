using System.Net;

namespace Restaurant.Application.Common.Exceptions;

/// <summary>
/// Base for expected, "the caller did something we can explain" failures. The API's
/// exception middleware turns these into the right status code + ProblemDetails payload,
/// so services can just throw instead of returning result objects everywhere.
/// </summary>
public abstract class AppException(string message, HttpStatusCode statusCode) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
}

/// <summary>404 — the requested entity does not exist (or is not visible to this caller).</summary>
public class NotFoundException(string message) : AppException(message, HttpStatusCode.NotFound)
{
    public static NotFoundException For(string entity, object key) =>
        new($"{entity} '{key}' was not found.");
}

/// <summary>400 — the request is well-formed but breaks a business rule.</summary>
public class BusinessRuleException(string message) : AppException(message, HttpStatusCode.BadRequest);

/// <summary>409 — the request conflicts with current state (duplicate email, stale order, …).</summary>
public class ConflictException(string message) : AppException(message, HttpStatusCode.Conflict);

/// <summary>401 — bad credentials or an invalid/expired token.</summary>
public class AuthenticationException(string message) : AppException(message, HttpStatusCode.Unauthorized);

/// <summary>403 — authenticated, but not allowed to touch this particular resource.</summary>
public class ForbiddenException(string message) : AppException(message, HttpStatusCode.Forbidden);

/// <summary>422 — field-level validation failures, reported per property for the UI to bind to.</summary>
public class ValidationException(IDictionary<string, string[]> errors)
    : AppException("One or more validation errors occurred.", HttpStatusCode.UnprocessableEntity)
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public ValidationException(string property, string error)
        : this(new Dictionary<string, string[]> { [property] = [error] }) { }
}
