using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Infrastructure;

namespace ProCoderJi.Api.Features.Accounts;

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this WebApplication app)
    {
        app.MapGet("/api/platform/auth/session", (HttpContext context, PlatformConfiguration configuration, IAntiforgery antiforgery) =>
        {
            var id = ApiSecurity.UserId(context);
            var user = id is null ? null : new { id = id.Value.ToString(), email = context.User.FindFirstValue(ClaimTypes.Email) ?? "", name = context.User.FindFirstValue(ClaimTypes.Name) ?? "Student" };
            var tokens = antiforgery.GetAndStoreTokens(context);
            return Results.Json(new { configured = configuration.GoogleConfigured, user, csrfToken = tokens.RequestToken ?? "" });
        });
        app.MapGet("/api/platform/auth/google", (HttpContext context, PlatformConfiguration configuration, string? returnTo) =>
        {
            if (!configuration.GoogleConfigured) return Results.Json(new { error = "Google sign-in is not configured on this deployment." }, statusCode: 503);
            return Results.Challenge(new AuthenticationProperties { RedirectUri = configuration.ReturnUrl(returnTo) }, [PlatformConfiguration.GoogleScheme]);
        });
        app.MapPost("/api/platform/auth/logout", async (HttpContext context, PlatformConfiguration configuration, IAntiforgery antiforgery) =>
        {
            var error = await ApiSecurity.CheckWrite(context, configuration, antiforgery);
            if (error is not null) return error;
            await context.SignOutAsync(PlatformConfiguration.CookieScheme);
            return Results.NoContent();
        });
    }
}
