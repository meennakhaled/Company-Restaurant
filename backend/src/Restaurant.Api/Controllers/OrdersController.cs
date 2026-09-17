using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Restaurant.Api.Common;
using Restaurant.Application.Common.Models;
using Restaurant.Application.Orders;
using Restaurant.Application.Orders.Dtos;

namespace Restaurant.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController(IOrderService orderService) : ControllerBase
{
    /// <summary>
    /// Re-prices the cart on the server. The React cart calls this before checkout so the
    /// customer is shown exactly the totals the order will be created with.
    /// </summary>
    [HttpPost("preview")]
    [ProducesResponseType<CartPreviewDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<CartPreviewDto>> Preview(CartPreviewRequest request, CancellationToken ct) =>
        Ok(await orderService.PreviewAsync(request, ct));

    [HttpPost]
    [Authorize(Roles = Roles.Customer)]
    [ProducesResponseType<OrderDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<OrderDto>> Place(PlaceOrderRequest request, CancellationToken ct)
    {
        var order = await orderService.PlaceAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    /// <summary>The signed-in customer's own orders.</summary>
    [HttpGet("my")]
    [ProducesResponseType<PagedResult<OrderSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<OrderSummaryDto>>> MyOrders(
        [FromQuery] OrderQuery query, CancellationToken ct) =>
        Ok(await orderService.SearchMineAsync(query, ct));

    /// <summary>All orders, for the kitchen board and the admin order list.</summary>
    [HttpGet]
    [Authorize(Roles = Roles.StaffOrAdmin)]
    [ProducesResponseType<PagedResult<OrderSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<OrderSummaryDto>>> Search(
        [FromQuery] OrderQuery query, CancellationToken ct) =>
        Ok(await orderService.SearchAsync(query, ct));

    /// <summary>Customers may only load their own orders; the service enforces that.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType<OrderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<OrderDto>> GetById(int id, CancellationToken ct) =>
        Ok(await orderService.GetByIdAsync(id, ct));

    /// <summary>Moves an order along the lifecycle. Invalid transitions are rejected.</summary>
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = Roles.StaffOrAdmin)]
    [ProducesResponseType<OrderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderDto>> UpdateStatus(
        int id, UpdateOrderStatusRequest request, CancellationToken ct) =>
        Ok(await orderService.UpdateStatusAsync(id, request, ct));

    /// <summary>Customer self-service cancellation, allowed only while the order is still New.</summary>
    [HttpPost("{id:int}/cancel")]
    [Authorize(Roles = Roles.Customer)]
    [ProducesResponseType<OrderDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<OrderDto>> Cancel(
        int id, CancelOrderRequest request, CancellationToken ct) =>
        Ok(await orderService.CancelMyOrderAsync(id, request, ct));
}
