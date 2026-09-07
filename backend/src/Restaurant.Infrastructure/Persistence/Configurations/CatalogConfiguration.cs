using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name).IsRequired().HasMaxLength(80);
        builder.Property(c => c.Slug).IsRequired().HasMaxLength(100);
        builder.Property(c => c.Description).HasMaxLength(500);
        builder.Property(c => c.ImageUrl).HasMaxLength(500);

        builder.HasIndex(c => c.Name).IsUnique();
        builder.HasIndex(c => c.Slug).IsUnique();
        builder.HasIndex(c => c.DisplayOrder);
    }
}

public class MenuItemConfiguration : IEntityTypeConfiguration<MenuItem>
{
    public void Configure(EntityTypeBuilder<MenuItem> builder)
    {
        builder.ToTable("MenuItems", t =>
        {
            t.HasCheckConstraint("CK_MenuItems_Price", "[Price] > 0");
            t.HasCheckConstraint("CK_MenuItems_PreparationMinutes", "[PreparationMinutes] BETWEEN 1 AND 240");
        });

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Name).IsRequired().HasMaxLength(120);
        builder.Property(m => m.Description).HasMaxLength(1000);
        builder.Property(m => m.ImageUrl).HasMaxLength(500);

        // decimal(18,2) everywhere money is stored — never float, which cannot represent cents exactly.
        builder.Property(m => m.Price).HasPrecision(18, 2);

        builder.Property(m => m.Availability).HasConversion<int>();

        builder.HasOne(m => m.Category)
            .WithMany(c => c.MenuItems)
            .HasForeignKey(m => m.CategoryId)
            // Restrict rather than cascade: deleting a category must not silently delete its dishes.
            .OnDelete(DeleteBehavior.Restrict);

        // The menu browse query filters on these three columns on every request.
        builder.HasIndex(m => new { m.IsDeleted, m.IsAvailable, m.CategoryId });

        // Filtered unique index: dish names stay unique among live items, but archived
        // items keep their name and do not block reusing it.
        builder.HasIndex(m => m.Name)
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");
    }
}

public class DailyMenuItemConfiguration : IEntityTypeConfiguration<DailyMenuItem>
{
    public void Configure(EntityTypeBuilder<DailyMenuItem> builder)
    {
        builder.ToTable("DailyMenuItems", t =>
        {
            t.HasCheckConstraint("CK_DailyMenuItems_QuantitySold", "[QuantitySold] >= 0");
            t.HasCheckConstraint("CK_DailyMenuItems_QuantityAvailable",
                "[QuantityAvailable] IS NULL OR [QuantityAvailable] >= 0");
            t.HasCheckConstraint("CK_DailyMenuItems_SpecialPrice",
                "[SpecialPrice] IS NULL OR [SpecialPrice] > 0");
        });

        builder.HasKey(d => d.Id);

        // DateOnly maps to SQL Server's `date` — no time component to get wrong across timezones.
        builder.Property(d => d.MenuDate).HasColumnType("date");
        builder.Property(d => d.SpecialPrice).HasPrecision(18, 2);
        builder.Property(d => d.Note).HasMaxLength(200);
        builder.Property(d => d.RowVersion).IsRowVersion();

        builder.Ignore(d => d.RemainingQuantity);
        builder.Ignore(d => d.IsExhausted);

        builder.HasOne(d => d.MenuItem)
            .WithMany(m => m.DailyMenuItems)
            .HasForeignKey(d => d.MenuItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // A dish can only be scheduled once per day, enforced by the database rather than by
        // a check-then-insert race in application code.
        builder.HasIndex(d => new { d.MenuDate, d.MenuItemId }).IsUnique();

        // "Show me the menu for this date" — the hottest read in the app.
        builder.HasIndex(d => d.MenuDate);
    }
}
