using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Restaurant.Api.Common;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Domain.Enums;

namespace Restaurant.Api.Hubs;

/// <summary>
/// Pushes order events to the people who need them:
///   • staff and admins join the kitchen group and see every order;
///   • customers join a group of their own and only ever receive their own orders.
///
/// The hub requires authentication, so group membership is derived from the signed token
/// rather than from anything the client asks for.
/// </summary>
[Authorize]
public class OrdersHub(ICurrentUser currentUser) : Hub
{
    public const string KitchenGroup = "kitchen";

    public static string CustomerGroup(int customerId) => $"customer-{customerId}";

    public override async Task OnConnectedAsync()
    {
        if (currentUser.Role is UserRole.Staff or UserRole.Admin)
            await Groups.AddToGroupAsync(Context.ConnectionId, KitchenGroup);

        if (currentUser.UserId is { } userId)
            await Groups.AddToGroupAsync(Context.ConnectionId, CustomerGroup(userId));

        await base.OnConnectedAsync();
    }
}

/// <summary>Client-side event names, shared with the React client.</summary>
public static class OrderEvents
{
    public const string OrderPlaced = "OrderPlaced";
    public const string OrderStatusChanged = "OrderStatusChanged";
}
