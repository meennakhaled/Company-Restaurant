namespace Restaurant.Application.Common.Abstractions;

/// <summary>
/// Injected instead of calling DateTime.UtcNow directly, so "today's menu" and the
/// dashboard's date windows are testable and honour the restaurant's local timezone.
/// </summary>
public interface IClock
{
    DateTime UtcNow { get; }

    /// <summary>Wall-clock time in the restaurant's configured timezone.</summary>
    DateTime LocalNow { get; }

    /// <summary>The restaurant's current service date — what "today's menu" means.</summary>
    DateOnly Today { get; }
}
