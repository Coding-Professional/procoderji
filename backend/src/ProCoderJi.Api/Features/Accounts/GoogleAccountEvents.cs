using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
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
        await using var db = await context.HttpContext.RequestServices.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync(context.HttpContext.RequestAborted);
        var user = await db.Users.SingleOrDefaultAsync(user => user.GoogleSubject == subject, context.HttpContext.RequestAborted);
        if (user is null)
        {
            user = new LearnerUser { Id = Guid.NewGuid(), GoogleSubject = subject, Email = email[..Math.Min(email.Length, 320)], Name = name[..Math.Min(name.Length, 200)], CreatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };
            db.Users.Add(user);
            try { await db.SaveChangesAsync(context.HttpContext.RequestAborted); }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                user = await db.Users.SingleOrDefaultAsync(user => user.GoogleSubject == subject, context.HttpContext.RequestAborted);
                if (user is null) throw;
            }
        }
        var currentEmail = email[..Math.Min(email.Length, 320)];
        var currentName = name[..Math.Min(name.Length, 200)];
        if (user.Email != currentEmail || user.Name != currentName)
        {
            user.Email = currentEmail;
            user.Name = currentName;
            await db.SaveChangesAsync(context.HttpContext.RequestAborted);
        }
        var identity = new ClaimsIdentity(PlatformConfiguration.CookieScheme);
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Email, user.Email));
        identity.AddClaim(new Claim(ClaimTypes.Name, user.Name));
        context.Principal = new ClaimsPrincipal(identity);
    }
}
