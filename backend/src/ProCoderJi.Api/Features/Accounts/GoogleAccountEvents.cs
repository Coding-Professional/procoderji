using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Features.Accounts;

public static class GoogleAccountEvents
{
    public static async Task CompleteTicket(TicketReceivedContext context)
    {
        var subject = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(subject) || subject.Length > 255) { context.Fail("Google did not return a valid subject."); return; }
        var email = context.Principal?.FindFirstValue(ClaimTypes.Email) ?? "";
        var name = context.Principal?.FindFirstValue(ClaimTypes.Name) ?? "Student";
        var accounts = context.HttpContext.RequestServices.GetRequiredService<IAccountStore>();
        var user = await accounts.SignIn(subject, email, name, context.HttpContext.RequestAborted);
        var identity = new ClaimsIdentity(PlatformConfiguration.CookieScheme);
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Email, user.Email));
        identity.AddClaim(new Claim(ClaimTypes.Name, user.Name));
        context.Principal = new ClaimsPrincipal(identity);
    }
}
