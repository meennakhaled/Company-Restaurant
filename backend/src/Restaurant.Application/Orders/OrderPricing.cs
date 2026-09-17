using Restaurant.Application.Common.Settings;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Orders;

/// <summary>Money totals for an order. Always produced from server-side prices.</summary>
public readonly record struct OrderTotals(decimal Subtotal, decimal TaxAmount, decimal DeliveryFee, decimal Total);

/// <summary>
/// One place where order money is calculated, shared by the cart preview and by checkout,
/// so a customer can never be quoted one total and charged another.
/// </summary>
public static class OrderPricing
{
    public static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static OrderTotals Calculate(decimal subtotal, OrderType orderType, RestaurantOptions options)
    {
        subtotal = Round(subtotal);

        var deliveryFee = orderType == OrderType.Delivery && subtotal < options.FreeDeliveryThreshold
            ? Round(options.DeliveryFee)
            : 0m;

        var tax = Round(subtotal * options.TaxRate);

        return new OrderTotals(subtotal, tax, deliveryFee, Round(subtotal + tax + deliveryFee));
    }
}
