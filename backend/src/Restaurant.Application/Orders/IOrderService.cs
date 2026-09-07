using Restaurant.Application.Common.Models;
using Restaurant.Application.Orders.Dtos;

namespace Restaurant.Application.Orders;

public interface IOrderService
{
    /// <summary>Prices a cart without persisting anything, so the client never guesses totals.</summary>
    Task<CartPreviewDto> PreviewAsync(CartPreviewRequest request, CancellationToken ct = default);

    Task<OrderDto> PlaceAsync(PlaceOrderRequest request, CancellationToken ct = default);

    /// <summary>Staff/admin view across all customers.</summary>
    Task<PagedResult<OrderSummaryDto>> SearchAsync(OrderQuery query, CancellationToken ct = default);

    /// <summary>The signed-in customer's own order history.</summary>
    Task<PagedResult<OrderSummaryDto>> SearchMineAsync(OrderQuery query, CancellationToken ct = default);

    /// <summary>Customers may only load their own orders; staff and admins may load any.</summary>
    Task<OrderDto> GetByIdAsync(int id, CancellationToken ct = default);

    Task<OrderDto> UpdateStatusAsync(int id, UpdateOrderStatusRequest request, CancellationToken ct = default);

    /// <summary>Customer-initiated cancellation, allowed only before the kitchen starts cooking.</summary>
    Task<OrderDto> CancelMyOrderAsync(int id, CancelOrderRequest request, CancellationToken ct = default);
}
