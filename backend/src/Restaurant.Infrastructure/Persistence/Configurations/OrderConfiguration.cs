using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Persistence.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders", t =>
        {
            t.HasCheckConstraint("CK_Orders_Status", "[Status] BETWEEN 1 AND 5");
            t.HasCheckConstraint("CK_Orders_Type", "[Type] BETWEEN 1 AND 3");
            t.HasCheckConstraint("CK_Orders_Amounts",
                "[Subtotal] >= 0 AND [TaxAmount] >= 0 AND [DeliveryFee] >= 0 AND [TotalAmount] >= 0");
        });

        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber).IsRequired().HasMaxLength(30);
        builder.Property(o => o.TableNumber).HasMaxLength(20);
        builder.Property(o => o.DeliveryAddress).HasMaxLength(300);
        builder.Property(o => o.ContactPhone).HasMaxLength(30);
        builder.Property(o => o.Notes).HasMaxLength(500);
        builder.Property(o => o.CancellationReason).HasMaxLength(300);

        builder.Property(o => o.Status).HasConversion<int>();
        builder.Property(o => o.Type).HasConversion<int>();

        builder.Property(o => o.Subtotal).HasPrecision(18, 2);
        builder.Property(o => o.TaxAmount).HasPrecision(18, 2);
        builder.Property(o => o.DeliveryFee).HasPrecision(18, 2);
        builder.Property(o => o.TotalAmount).HasPrecision(18, 2);

        builder.Property(o => o.RowVersion).IsRowVersion();

        builder.HasOne(o => o.Customer)
            .WithMany(u => u.Orders)
            .HasForeignKey(o => o.CustomerId)
            // Customers are deactivated, never deleted, so their orders stay intact.
            .OnDelete(DeleteBehavior.Restrict);

        // OrderNumber is what staff type into the search box.
        builder.HasIndex(o => o.OrderNumber).IsUnique();

        // The kitchen board reads "active orders, oldest first"; the admin list reads by date.
        builder.HasIndex(o => new { o.Status, o.PlacedAt });
        builder.HasIndex(o => o.PlacedAt);
        builder.HasIndex(o => new { o.CustomerId, o.PlacedAt });
    }
}

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("OrderItems", t =>
        {
            t.HasCheckConstraint("CK_OrderItems_Quantity", "[Quantity] > 0");
            t.HasCheckConstraint("CK_OrderItems_UnitPrice", "[UnitPrice] >= 0");
        });

        builder.HasKey(i => i.Id);

        builder.Property(i => i.ItemName).IsRequired().HasMaxLength(120);
        builder.Property(i => i.Notes).HasMaxLength(200);
        builder.Property(i => i.UnitPrice).HasPrecision(18, 2);
        builder.Property(i => i.LineTotal).HasPrecision(18, 2);

        builder.HasOne(i => i.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.MenuItem)
            .WithMany(m => m.OrderItems)
            .HasForeignKey(i => i.MenuItemId)
            // Menu items are soft-deleted, so this reference always resolves.
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.OrderId);
        builder.HasIndex(i => i.MenuItemId);
    }
}

public class OrderStatusHistoryConfiguration : IEntityTypeConfiguration<OrderStatusHistory>
{
    public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
    {
        builder.ToTable("OrderStatusHistory");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.FromStatus).HasConversion<int?>();
        builder.Property(h => h.ToStatus).HasConversion<int>();
        builder.Property(h => h.Note).HasMaxLength(300);

        builder.HasOne(h => h.Order)
            .WithMany(o => o.StatusHistory)
            .HasForeignKey(h => h.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.ChangedByUser)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            // The audit row survives even if the acting account is ever removed.
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => new { h.OrderId, h.ChangedAt });
    }
}
