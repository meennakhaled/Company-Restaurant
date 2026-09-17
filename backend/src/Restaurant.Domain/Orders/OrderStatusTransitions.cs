using Restaurant.Domain.Enums;

namespace Restaurant.Domain.Orders;

/// <summary>
/// The single source of truth for the order lifecycle. Keeping the state machine in the
/// domain means the API, the staff board and any future channel all enforce the same rules.
///
///   New → Preparing → Ready → Completed
///    └────────┴─────────┴──→ Cancelled  (only before the order is handed over)
/// </summary>
public static class OrderStatusTransitions
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Allowed = new()
    {
        [OrderStatus.New] = [OrderStatus.Preparing, OrderStatus.Cancelled],
        [OrderStatus.Preparing] = [OrderStatus.Ready, OrderStatus.Cancelled],
        [OrderStatus.Ready] = [OrderStatus.Completed, OrderStatus.Cancelled],
        [OrderStatus.Completed] = [],
        [OrderStatus.Cancelled] = []
    };

    public static IReadOnlyCollection<OrderStatus> NextStatuses(OrderStatus current) =>
        Allowed.TryGetValue(current, out var next) ? next : [];

    public static bool CanTransition(OrderStatus from, OrderStatus to) =>
        NextStatuses(from).Contains(to);

    /// <summary>Terminal states can no longer change and are excluded from the active queue.</summary>
    public static bool IsFinal(OrderStatus status) =>
        status is OrderStatus.Completed or OrderStatus.Cancelled;
}
