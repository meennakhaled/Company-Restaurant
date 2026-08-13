namespace Restaurant.Domain.Enums;

/// <summary>
/// How a dish is normally offered.
///
/// This does not decide whether a dish is on sale — the daily menu does that, and every dish
/// must be scheduled onto a date to be orderable. What this decides is how the dish is
/// planned and presented: staples are added to a day in bulk and shown as the regular menu,
/// specials are picked per day and lead the menu as the chef's choice.
/// </summary>
public enum MenuAvailability
{
    /// <summary>A staple. The planner can add every staple to a day in one click.</summary>
    Everyday = 1,

    /// <summary>An occasional dish the chef picks for particular days, badged as today's special.</summary>
    DailySpecial = 2
}
