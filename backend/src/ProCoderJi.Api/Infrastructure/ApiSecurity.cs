using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using ProCoderJi.Api.Configuration;

namespace ProCoderJi.Api.Infrastructure;

public static class ApiSecurity
{
    public static Guid? UserId(HttpContext context) => Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) && id != Guid.Empty ? id : null;

    public static IResult? CheckAccount(HttpContext context, Guid id)
        => !Guid.TryParse(context.Request.Headers["x-account-id"], out var expected) || expected != id
            ? Results.Json(new { error = "The signed-in account changed. Refresh before trying again." }, statusCode: 409) : null;

    public static async Task<IResult?> CheckWrite(HttpContext context, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        if (!string.Equals(context.Request.Headers.Origin, configuration.PublicOrigin.GetLeftPart(UriPartial.Authority), StringComparison.Ordinal))
            return Results.Json(new { error = "This request must come from the current site." }, statusCode: 403);
        try { await antiforgery.ValidateRequestAsync(context); }
        catch (AntiforgeryValidationException) { return Results.Json(new { error = "Refresh your account session before trying this action." }, statusCode: 403); }
        return null;
    }
}
