using Microsoft.Extensions.Options;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Settings;

namespace Restaurant.Infrastructure.Services;

/// <summary>
/// Everything is stored in UTC; "today" is resolved in the restaurant's own timezone so a
/// kitchen in Cairo does not roll over to tomorrow's menu at 2am local time.
/// </summary>
public class SystemClock : IClock
{
    private readonly TimeZoneInfo _timeZone;

    public SystemClock(IOptions<RestaurantOptions> options)
    {
        _timeZone = ResolveTimeZone(options.Value.TimeZone);
    }

    public DateTime UtcNow => DateTime.UtcNow;

    public DateTime LocalNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _timeZone);

    public DateOnly Today => DateOnly.FromDateTime(LocalNow);

    private static TimeZoneInfo ResolveTimeZone(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return TimeZoneInfo.Utc;

        // Accepts both IANA ("Africa/Cairo") and Windows ("Egypt Standard Time") ids, and
        // falls back to UTC rather than crashing the app on a bad configuration value.
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
