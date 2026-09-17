namespace Restaurant.Domain.Common;

/// <summary>
/// Base type for entities that track their own creation/modification timestamps.
/// Timestamps are stamped centrally in <c>RestaurantDbContext.SaveChangesAsync</c>
/// so no service has to remember to set them.
/// </summary>
public abstract class AuditableEntity
{
    public int Id { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}
