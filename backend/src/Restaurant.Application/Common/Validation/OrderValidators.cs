using FluentValidation;
using Restaurant.Application.Orders.Dtos;
using Restaurant.Application.Users.Dtos;
using Restaurant.Domain.Enums;

namespace Restaurant.Application.Common.Validation;

public class PlaceOrderItemRequestValidator : AbstractValidator<PlaceOrderItemRequest>
{
    public PlaceOrderItemRequestValidator()
    {
        RuleFor(x => x.MenuItemId).GreaterThan(0).WithMessage("Invalid dish reference.");

        RuleFor(x => x.Quantity)
            .InclusiveBetween(1, 20).WithMessage("Quantity must be between 1 and 20.");

        RuleFor(x => x.Notes).MaximumLength(200).WithMessage("Item notes must be at most 200 characters.");
    }
}

public class PlaceOrderRequestValidator : AbstractValidator<PlaceOrderRequest>
{
    public PlaceOrderRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum().WithMessage("Select a valid order type.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Your cart is empty.");

        RuleForEach(x => x.Items).SetValidator(new PlaceOrderItemRequestValidator());

        // Shape rules that depend on the order type. The service re-checks these so that any
        // future caller is held to the same rules, but validating here gives a per-field message.
        RuleFor(x => x.TableNumber)
            .NotEmpty().When(x => x.Type == OrderType.DineIn)
            .WithMessage("A table number is required for dine-in orders.")
            .MaximumLength(20).WithMessage("Table number must be at most 20 characters.");

        RuleFor(x => x.DeliveryAddress)
            .NotEmpty().When(x => x.Type == OrderType.Delivery)
            .WithMessage("A delivery address is required.")
            .MaximumLength(300).WithMessage("Address must be at most 300 characters.");

        RuleFor(x => x.ContactPhone)
            .NotEmpty().When(x => x.Type == OrderType.Delivery)
            .WithMessage("A contact phone number is required for delivery.");

        RuleFor(x => x.ContactPhone).PhoneNumberRule();

        RuleFor(x => x.Notes).MaximumLength(500).WithMessage("Notes must be at most 500 characters.");
    }
}

public class CartPreviewRequestValidator : AbstractValidator<CartPreviewRequest>
{
    public CartPreviewRequestValidator()
    {
        RuleFor(x => x.Type).IsInEnum().WithMessage("Select a valid order type.");
        RuleForEach(x => x.Items).SetValidator(new PlaceOrderItemRequestValidator());
    }
}

public class UpdateOrderStatusRequestValidator : AbstractValidator<UpdateOrderStatusRequest>
{
    public UpdateOrderStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum().WithMessage("Select a valid status.");
        RuleFor(x => x.Note).MaximumLength(300).WithMessage("Note must be at most 300 characters.");
    }
}

public class CancelOrderRequestValidator : AbstractValidator<CancelOrderRequest>
{
    public CancelOrderRequestValidator() =>
        RuleFor(x => x.Reason).MaximumLength(300).WithMessage("Reason must be at most 300 characters.");
}

public class CreateStaffRequestValidator : AbstractValidator<CreateStaffRequest>
{
    public CreateStaffRequestValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(120).WithMessage("Full name must be at most 120 characters.");

        RuleFor(x => x.Email).EmailAddressRule();
        RuleFor(x => x.Password).Password();
        RuleFor(x => x.PhoneNumber).PhoneNumberRule();

        RuleFor(x => x.Role)
            .IsInEnum().WithMessage("Select a valid role.")
            .NotEqual(UserRole.Customer)
            .WithMessage("Use this form for staff and admin accounts only. Customers register themselves.");
    }
}

public class UpdateUserRoleRequestValidator : AbstractValidator<UpdateUserRoleRequest>
{
    public UpdateUserRoleRequestValidator() =>
        RuleFor(x => x.Role).IsInEnum().WithMessage("Select a valid role.");
}
