using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Restaurant.Application.Common.Exceptions;
using ValidationException = Restaurant.Application.Common.Exceptions.ValidationException;

namespace Restaurant.Api.Middleware;

/// <summary>
/// Single exit point for every unhandled failure, so the API always answers with the same
/// JSON shape and never leaks a stack trace to a client.
/// </summary>
public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment environment)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception exception)
    {
        var (status, title, errors) = Translate(exception);

        // Expected business failures are noise at error level; anything else is a real bug.
        if (status >= HttpStatusCode.InternalServerError)
            logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
        else
            logger.LogInformation("{Status} on {Method} {Path}: {Message}",
                (int)status, context.Request.Method, context.Request.Path, exception.Message);

        if (context.Response.HasStarted)
            return;

        context.Response.Clear();
        context.Response.StatusCode = (int)status;
        context.Response.ContentType = "application/problem+json";

        var payload = new ApiErrorResponse
        {
            Status = (int)status,
            Title = title,
            Errors = errors,
            TraceId = context.TraceIdentifier,
            // Stack traces are only ever exposed in Development.
            Detail = environment.IsDevelopment() && status >= HttpStatusCode.InternalServerError
                ? exception.ToString()
                : null
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
    }

    private static (HttpStatusCode Status, string Title, IDictionary<string, string[]>? Errors) Translate(
        Exception exception) => exception switch
    {
        ValidationException validation =>
            (validation.StatusCode, validation.Message, validation.Errors),

        AppException app =>
            (app.StatusCode, app.Message, null),

        DbUpdateConcurrencyException =>
            (HttpStatusCode.Conflict, "This record was changed by someone else. Refresh and try again.", null),

        DbUpdateException =>
            (HttpStatusCode.Conflict, "The change conflicts with existing data.", null),

        OperationCanceledException =>
            ((HttpStatusCode)499, "The request was cancelled.", null),

        _ => (HttpStatusCode.InternalServerError, "Something went wrong on our side. Please try again.", null)
    };
}

public class ApiErrorResponse
{
    public int Status { get; init; }

    public string Title { get; init; } = string.Empty;

    /// <summary>Field-level messages, keyed by property name, for forms to display inline.</summary>
    public IDictionary<string, string[]>? Errors { get; init; }

    public string? TraceId { get; init; }

    public string? Detail { get; init; }
}
