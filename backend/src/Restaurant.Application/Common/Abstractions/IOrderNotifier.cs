using Restaurant.Application.Orders.Dtos;

namespace Restaurant.Application.Common.Abstractions;

/// <summary>
/// Real-time fan-out for the kitchen board and customer order tracking.
/// Implemented over SignalR in the API layer; abstracted here so OrderService has no
/// dependency on the transport.
/// </summary>
public interface IOrderNotifier
{
    /// <summary>Pushes a newly placed order to every connected staff member and admin.</summary>
    Task OrderPlacedAsync(OrderDto order, CancellationToken ct = default);

    /// <summary>Notifies staff and the owning customer that an order moved to a new status.</summary>
    Task OrderStatusChangedAsync(OrderDto order, CancellationToken ct = default);
}
