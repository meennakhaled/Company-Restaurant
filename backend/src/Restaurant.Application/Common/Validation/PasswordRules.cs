using System.Text.RegularExpressions;
using FluentValidation;

namespace Restaurant.Application.Common.Validation;

public static partial class PasswordRules
{
    public const int MinimumLength = 8;

    /// <summary>
    /// One password policy, applied to registration, staff creation and password changes alike.
    /// Deliberately modest: length plus a letter and a digit blocks the obvious weak passwords
    /// without pushing users toward writing them down.
    /// </summary>
    public static IRuleBuilderOptions<T, string> Password<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Password is required.")
            .MinimumLength(MinimumLength)
            .WithMessage($"Password must be at least {MinimumLength} characters.")
            .MaximumLength(128).WithMessage("Password must be at most 128 characters.")
            .Matches("[A-Za-z]").WithMessage("Password must contain at least one letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one number.");

    public static IRuleBuilderOptions<T, string> EmailAddressRule<T>(this IRuleBuilder<T, string> rule) =>
        rule.NotEmpty().WithMessage("Email is required.")
            .MaximumLength(256).WithMessage("Email must be at most 256 characters.")
            .EmailAddress().WithMessage("Enter a valid email address.");

    /// <summary>Optional field: blank is accepted, anything supplied must look like a phone number.</summary>
    public static IRuleBuilderOptions<T, string?> PhoneNumberRule<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(value => string.IsNullOrWhiteSpace(value) || PhoneNumberPattern().IsMatch(value))
            .WithMessage("Enter a valid phone number.");

    [GeneratedRegex(@"^\+?[0-9\s\-()]{7,20}$")]
    private static partial Regex PhoneNumberPattern();
}
