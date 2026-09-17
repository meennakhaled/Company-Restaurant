using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Restaurant.Application.Common.Abstractions;
using Restaurant.Application.Common.Settings;

namespace Restaurant.Api.Controllers;

/// <summary>
/// Public restaurant context.
///
/// The client must not derive "today" from the browser clock — a customer in a different
/// timezone (or one whose machine has rolled past midnight) would then label and cache the
/// menu against a date the kitchen does not recognise. The service date, like prices, comes
/// from the server.
/// </summary>
[ApiController]
[Route("api/restaurant")]
[AllowAnonymous]
public class RestaurantController(IOptions<RestaurantOptions> options, IClock clock) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<RestaurantInfoDto>(StatusCodes.Status200OK)]
    public ActionResult<RestaurantInfoDto> GetInfo()
    {
        var settings = options.Value;

        return Ok(new RestaurantInfoDto(
            settings.Name,
            settings.Currency,
            clock.Today,
            settings.TaxRate,
            settings.DeliveryFee,
            settings.FreeDeliveryThreshold,
            settings.MaxQuantityPerItem));
    }
}

public record RestaurantInfoDto(
    string Name,
    string Currency,
    DateOnly ServiceDate,
    decimal TaxRate,
    decimal DeliveryFee,
    decimal FreeDeliveryThreshold,
    int MaxQuantityPerItem);
