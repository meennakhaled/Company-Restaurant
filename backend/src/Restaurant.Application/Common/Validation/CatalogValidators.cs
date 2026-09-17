using FluentValidation;
using Restaurant.Application.Categories.Dtos;
using Restaurant.Application.DailyMenus.Dtos;
using Restaurant.Application.MenuItems.Dtos;

namespace Restaurant.Application.Common.Validation;

public class SaveCategoryRequestValidator : AbstractValidator<SaveCategoryRequest>
{
    public SaveCategoryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Category name is required.")
            .MaximumLength(80).WithMessage("Category name must be at most 80 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description must be at most 500 characters.");

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Image URL must be at most 500 characters.");

        RuleFor(x => x.DisplayOrder)
            .InclusiveBetween(0, 999).WithMessage("Display order must be between 0 and 999.");
    }
}

public class SaveMenuItemRequestValidator : AbstractValidator<SaveMenuItemRequest>
{
    public SaveMenuItemRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Dish name is required.")
            .MaximumLength(120).WithMessage("Dish name must be at most 120 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(1000).WithMessage("Description must be at most 1000 characters.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Price must be greater than 0.")
            .LessThanOrEqualTo(10_000).WithMessage("Price must be at most 10,000.")
            .Must(HaveAtMostTwoDecimals).WithMessage("Price cannot have more than 2 decimal places.");

        RuleFor(x => x.ImageUrl)
            .MaximumLength(500).WithMessage("Image URL must be at most 500 characters.");

        RuleFor(x => x.CategoryId)
            .GreaterThan(0).WithMessage("Please select a category.");

        RuleFor(x => x.PreparationMinutes)
            .InclusiveBetween(1, 240).WithMessage("Preparation time must be between 1 and 240 minutes.");

        RuleFor(x => x.Availability)
            .IsInEnum().WithMessage("Select a valid availability type.");
    }

    internal static bool HaveAtMostTwoDecimals(decimal value) => decimal.Round(value, 2) == value;
}

public class AddDailyMenuItemRequestValidator : AbstractValidator<AddDailyMenuItemRequest>
{
    public AddDailyMenuItemRequestValidator()
    {
        RuleFor(x => x.MenuItemId).GreaterThan(0).WithMessage("Please choose a dish.");

        RuleFor(x => x.QuantityAvailable)
            .InclusiveBetween(1, 10_000).When(x => x.QuantityAvailable.HasValue)
            .WithMessage("Quantity must be between 1 and 10,000. Leave it empty for unlimited.");

        RuleFor(x => x.SpecialPrice)
            .GreaterThan(0).When(x => x.SpecialPrice.HasValue)
            .WithMessage("The special price must be greater than 0.");

        RuleFor(x => x.SpecialPrice!.Value)
            .Must(SaveMenuItemRequestValidator.HaveAtMostTwoDecimals).When(x => x.SpecialPrice.HasValue)
            .WithMessage("The special price cannot have more than 2 decimal places.");

        RuleFor(x => x.Note).MaximumLength(200).WithMessage("Note must be at most 200 characters.");
    }
}

public class UpdateDailyMenuItemRequestValidator : AbstractValidator<UpdateDailyMenuItemRequest>
{
    public UpdateDailyMenuItemRequestValidator()
    {
        RuleFor(x => x.QuantityAvailable)
            .InclusiveBetween(0, 10_000).When(x => x.QuantityAvailable.HasValue)
            .WithMessage("Quantity must be between 0 and 10,000. Leave it empty for unlimited.");

        RuleFor(x => x.SpecialPrice)
            .GreaterThan(0).When(x => x.SpecialPrice.HasValue)
            .WithMessage("The special price must be greater than 0.");

        RuleFor(x => x.Note).MaximumLength(200).WithMessage("Note must be at most 200 characters.");
    }
}

public class CopyDailyMenuRequestValidator : AbstractValidator<CopyDailyMenuRequest>
{
    public CopyDailyMenuRequestValidator()
    {
        RuleFor(x => x.TargetDates)
            .NotEmpty().WithMessage("Select at least one date to copy to.")
            .Must(dates => dates.Count <= 31).WithMessage("You can copy to at most 31 dates at a time.");
    }
}
