using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;
using AppValidationException = Restaurant.Application.Common.Exceptions.ValidationException;

namespace Restaurant.Api.Common;

/// <summary>
/// Runs the FluentValidation validator for every action argument that has one, before the
/// action body executes. This keeps validation declarative and out of the controllers, and
/// routes failures through the same error shape as everything else.
/// </summary>
public class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var failures = new Dictionary<string, List<string>>();

        foreach (var argument in context.ActionArguments.Values.Where(a => a is not null))
        {
            var validatorType = typeof(IValidator<>).MakeGenericType(argument!.GetType());

            if (services.GetService(validatorType) is not IValidator validator)
                continue;

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);

            foreach (var failure in result.Errors)
            {
                // camelCased so the keys line up with the JSON field names React sends.
                var key = ToCamelCase(failure.PropertyName);

                if (!failures.TryGetValue(key, out var messages))
                    failures[key] = messages = [];

                messages.Add(failure.ErrorMessage);
            }
        }

        if (failures.Count > 0)
            throw new AppValidationException(
                failures.ToDictionary(f => f.Key, f => f.Value.ToArray()));

        await next();
    }

    private static string ToCamelCase(string property)
    {
        if (string.IsNullOrEmpty(property))
            return property;

        // Nested paths like "Items[0].Quantity" keep their shape; only segments are lowered.
        var segments = property.Split('.');

        for (var i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];
            if (segment.Length > 0 && char.IsUpper(segment[0]))
                segments[i] = char.ToLowerInvariant(segment[0]) + segment[1..];
        }

        return string.Join('.', segments);
    }
}
