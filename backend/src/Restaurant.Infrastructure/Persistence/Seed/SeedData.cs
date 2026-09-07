using Restaurant.Domain.Enums;

namespace Restaurant.Infrastructure.Persistence.Seed;

/// <summary>
/// The demo catalogue. Kept as plain records so <see cref="DatabaseSeeder"/> stays readable
/// and the data itself is easy to review or replace.
/// </summary>
internal static class SeedData
{
    internal record CategorySeed(string Name, string Description, int DisplayOrder, string ImageUrl);

    internal record MenuItemSeed(
        string Name,
        string Category,
        string Description,
        decimal Price,
        MenuAvailability Availability,
        int PreparationMinutes,
        bool IsVegetarian,
        bool IsSpicy,
        string ImageUrl);

    private const string Photos = "https://images.unsplash.com/photo-";
    private const string PhotoOptions = "?auto=format&fit=crop&w=800&q=70";

    private static string Photo(string id) => $"{Photos}{id}{PhotoOptions}";

    internal static readonly CategorySeed[] Categories =
    [
        new("Starters", "Small plates to begin the meal", 1, Photo("1572695157366-5e585ab2b69f")),
        new("Salads", "Fresh, crisp and made to order", 2, Photo("1512621776951-a57141f2eefd")),
        new("Main Courses", "Our signature plates", 3, Photo("1546964124-0cce460f38ef")),
        new("Pizza & Pasta", "Stone-baked and hand-rolled", 4, Photo("1513104890138-7c749659a591")),
        new("Grills", "Charcoal-grilled over open flame", 5, Photo("1598103442097-8b74394b95c6")),
        new("Desserts", "Made in-house every morning", 6, Photo("1578985545062-69928b1d9587")),
        new("Beverages", "Hot, cold and freshly pressed", 7, Photo("1509042239860-f550ce710b93"))
    ];

    internal static readonly MenuItemSeed[] MenuItems =
    [
        // ── Starters ───────────────────────────────────────────────────────────────
        new("Tomato Bruschetta", "Starters",
            "Grilled sourdough, vine tomatoes, garlic, basil and cold-pressed olive oil.",
            6.50m, MenuAvailability.Everyday, 10, true, false, Photo("1572695157366-5e585ab2b69f")),
        new("Garlic Butter Shrimp", "Starters",
            "Pan-seared shrimp in garlic butter with a squeeze of lemon and parsley.",
            11.00m, MenuAvailability.Everyday, 14, false, true, Photo("1519708227418-c8fd9a32b7a2")),
        new("Loaded Truffle Fries", "Starters",
            "Hand-cut fries, truffle oil, aged parmesan and chives.",
            7.50m, MenuAvailability.Everyday, 12, true, false, Photo("1573080496219-bb080dd4f877")),
        new("Roasted Pumpkin Soup", "Starters",
            "Slow-roasted pumpkin, coconut cream and toasted seeds.",
            6.00m, MenuAvailability.DailySpecial, 10, true, false, Photo("1547592166-23ac45744acd")),

        // ── Salads ─────────────────────────────────────────────────────────────────
        new("Caesar Salad", "Salads",
            "Baby romaine, shaved parmesan, sourdough croutons and classic Caesar dressing.",
            9.50m, MenuAvailability.Everyday, 8, true, false, Photo("1512621776951-a57141f2eefd")),
        new("Quinoa Garden Bowl", "Salads",
            "Quinoa, avocado, roasted vegetables, feta and a lemon-herb dressing.",
            11.50m, MenuAvailability.DailySpecial, 10, true, false, Photo("1512058564366-18510be2db19")),

        // ── Main Courses ───────────────────────────────────────────────────────────
        new("Grilled Salmon Fillet", "Main Courses",
            "Norwegian salmon, asparagus and a dill beurre blanc.",
            22.00m, MenuAvailability.Everyday, 22, false, false, Photo("1519708227418-c8fd9a32b7a2")),
        new("Herb Roasted Chicken", "Main Courses",
            "Half chicken marinated in rosemary and thyme, with roasted potatoes.",
            18.00m, MenuAvailability.Everyday, 28, false, false, Photo("1598103442097-8b74394b95c6")),
        new("Beef Stroganoff", "Main Courses",
            "Slow-braised beef in a mushroom cream sauce over buttered rice.",
            19.50m, MenuAvailability.DailySpecial, 30, false, false, Photo("1546964124-0cce460f38ef")),
        new("Chicken Shawarma Plate", "Main Courses",
            "Spit-roasted chicken, garlic sauce, pickles and saffron rice.",
            15.00m, MenuAvailability.DailySpecial, 18, false, true, Photo("1529006557810-274b9b2fc783")),
        new("Seafood Rice Bowl", "Main Courses",
            "Shrimp, calamari and mussels over herbed rice with a citrus glaze.",
            21.00m, MenuAvailability.DailySpecial, 25, false, true, Photo("1512058564366-18510be2db19")),

        // ── Pizza & Pasta ──────────────────────────────────────────────────────────
        new("Margherita Pizza", "Pizza & Pasta",
            "San Marzano tomato, fior di latte and fresh basil on a 48-hour dough.",
            13.00m, MenuAvailability.Everyday, 16, true, false, Photo("1513104890138-7c749659a591")),
        new("Pepperoni Pizza", "Pizza & Pasta",
            "Double pepperoni, mozzarella and a touch of chilli honey.",
            15.50m, MenuAvailability.Everyday, 16, false, true, Photo("1513104890138-7c749659a591")),
        new("Creamy Chicken Pasta", "Pizza & Pasta",
            "Fettuccine, grilled chicken, mushrooms and parmesan cream.",
            16.00m, MenuAvailability.DailySpecial, 20, false, false, Photo("1621996346565-e3dbc646d9a9")),
        new("Seafood Linguine", "Pizza & Pasta",
            "Linguine with prawns, clams, cherry tomatoes and white wine.",
            20.00m, MenuAvailability.DailySpecial, 24, false, true, Photo("1621996346565-e3dbc646d9a9")),

        // ── Grills ─────────────────────────────────────────────────────────────────
        new("Angus Beef Burger", "Grills",
            "200g Angus patty, aged cheddar, caramelised onion and house sauce.",
            14.50m, MenuAvailability.Everyday, 18, false, false, Photo("1568901346375-23c9450c58cd")),
        new("Ribeye Steak 300g", "Grills",
            "Charcoal-grilled ribeye with roasted garlic butter and seasonal greens.",
            32.00m, MenuAvailability.DailySpecial, 25, false, false, Photo("1546964124-0cce460f38ef")),
        new("Mixed Grill Platter", "Grills",
            "Lamb chops, chicken skewers and kofta with grilled vegetables.",
            28.00m, MenuAvailability.DailySpecial, 30, false, true, Photo("1598103442097-8b74394b95c6")),

        // ── Desserts ───────────────────────────────────────────────────────────────
        new("New York Cheesecake", "Desserts",
            "Baked vanilla cheesecake with a berry compote.",
            8.00m, MenuAvailability.Everyday, 5, true, false, Photo("1533134242443-d4fd215305ad")),
        new("Classic Tiramisu", "Desserts",
            "Espresso-soaked savoiardi, mascarpone cream and cocoa.",
            8.50m, MenuAvailability.Everyday, 5, true, false, Photo("1571877227200-a0d98ea607e9")),
        new("Molten Chocolate Cake", "Desserts",
            "Warm dark chocolate fondant with vanilla bean ice cream.",
            9.00m, MenuAvailability.DailySpecial, 12, true, false, Photo("1578985545062-69928b1d9587")),

        // ── Beverages ──────────────────────────────────────────────────────────────
        new("Fresh Lemonade", "Beverages",
            "Hand-pressed lemons, mint and a hint of honey.",
            4.50m, MenuAvailability.Everyday, 4, true, false, Photo("1621263764928-df1444c5e859")),
        new("Espresso", "Beverages",
            "Single-origin beans, roasted weekly.",
            3.00m, MenuAvailability.Everyday, 3, true, false, Photo("1509042239860-f550ce710b93")),
        new("Iced Caramel Latte", "Beverages",
            "Double espresso, cold milk, house caramel and ice.",
            5.50m, MenuAvailability.Everyday, 5, true, false, Photo("1509042239860-f550ce710b93"))
    ];

    /// <summary>
    /// A weekly rotation for the daily-menu planner, keyed by day of week. This is what makes
    /// the customer menu change from one day to the next out of the box.
    /// </summary>
    internal static readonly Dictionary<DayOfWeek, string[]> WeeklyRotation = new()
    {
        [DayOfWeek.Monday] = ["Creamy Chicken Pasta", "Herb Roasted Chicken", "Roasted Pumpkin Soup", "Quinoa Garden Bowl"],
        [DayOfWeek.Tuesday] = ["Seafood Linguine", "Beef Stroganoff", "Molten Chocolate Cake"],
        [DayOfWeek.Wednesday] = ["Chicken Shawarma Plate", "Ribeye Steak 300g", "Seafood Rice Bowl"],
        [DayOfWeek.Thursday] = ["Mixed Grill Platter", "Creamy Chicken Pasta", "Roasted Pumpkin Soup"],
        [DayOfWeek.Friday] = ["Ribeye Steak 300g", "Seafood Linguine", "Molten Chocolate Cake", "Quinoa Garden Bowl"],
        [DayOfWeek.Saturday] = ["Mixed Grill Platter", "Seafood Rice Bowl", "Beef Stroganoff", "Molten Chocolate Cake"],
        [DayOfWeek.Sunday] = ["Herb Roasted Chicken", "Chicken Shawarma Plate", "Roasted Pumpkin Soup"]
    };
}
