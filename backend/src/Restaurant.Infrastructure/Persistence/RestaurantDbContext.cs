using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Domain.Common;
using Restaurant.Domain.Entities;

namespace Restaurant.Infrastructure.Persistence;

public class RestaurantDbContext(DbContextOptions<RestaurantDbContext> options, IClock clock)
    : DbContext(options), IApplicationDbContext
{
    private IDbContextTransaction? _currentTransaction;

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<DailyMenuItem> DailyMenuItems => Set<DailyMenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RestaurantDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public async Task<IAsyncDisposable> BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        // Nested calls join the outer transaction rather than opening a second one.
        if (_currentTransaction is not null)
            return new NoOpTransactionScope();

        _currentTransaction = await Database.BeginTransactionAsync(cancellationToken);
        return new TransactionScope(this);
    }

    public async Task CommitTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTransaction is null)
            return;

        await _currentTransaction.CommitAsync(cancellationToken);
        await DisposeTransactionAsync();
    }

    /// <summary>
    /// Centralised auditing: every AuditableEntity gets CreatedAt on insert and UpdatedAt on
    /// change, so no service has to remember and none can get it wrong.
    /// </summary>
    private void StampTimestamps()
    {
        var now = clock.UtcNow;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    // Guard against a detached-graph update silently rewriting CreatedAt.
                    entry.Property(e => e.CreatedAt).IsModified = false;
                    break;
            }
        }
    }

    private async Task DisposeTransactionAsync()
    {
        if (_currentTransaction is null)
            return;

        await _currentTransaction.DisposeAsync();
        _currentTransaction = null;
    }

    /// <summary>Rolls back if the caller never committed (i.e. an exception unwound the block).</summary>
    private sealed class TransactionScope(RestaurantDbContext context) : IAsyncDisposable
    {
        public async ValueTask DisposeAsync()
        {
            if (context._currentTransaction is null)
                return;

            await context._currentTransaction.RollbackAsync();
            await context.DisposeTransactionAsync();
        }
    }

    private sealed class NoOpTransactionScope : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
