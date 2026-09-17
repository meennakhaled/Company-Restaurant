using Microsoft.AspNetCore.SignalR;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Orders.Dtos;

namespace Restaurant.Api.Hubs;

/// <summary>
/// SignalR implementation of the order fan-out. Failures are logged and swallowed: a
/// broken websocket must never roll back an order that was already committed.
/// </summary>
public class SignalROrderNotifier(
    IHubContext<OrdersHub> hub,
    ILogger<SignalROrderNotifier> logger) : IOrderNotifier
{
    public Task OrderPlacedAsync(OrderDto order, CancellationToken ct = default) =>
        SendAsync(OrderEvents.OrderPlaced, order, ct);

    public Task OrderStatusChangedAsync(OrderDto order, CancellationToken ct = default) =>
        SendAsync(OrderEvents.OrderStatusChanged, order, ct);

    private async Task SendAsync(string eventName, OrderDto order, CancellationToken ct)
    {
        try
        {
            await Task.WhenAll(
                hub.Clients.Group(OrdersHub.KitchenGroup).SendAsync(eventName, order, ct),
                hub.Clients.Group(OrdersHub.CustomerGroup(order.CustomerId)).SendAsync(eventName, order, ct));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to broadcast {Event} for order {OrderNumber}",
                eventName, order.OrderNumber);
        }
    }
}
