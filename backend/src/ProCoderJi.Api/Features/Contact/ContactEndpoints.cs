using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ProCoderJi.Api.Configuration;

namespace ProCoderJi.Api.Features.Contact;

public static class ContactEndpoints
{
    public const int BodyLimit = 32 * 1024;
    public static void MapContactEndpoints(this WebApplication app)
    {
        app.MapGet("/api/platform/contact/config", (ContactConfiguration configuration) =>
            Results.Json(new { configured = configuration.Configured, siteKey = configuration.Configured ? configuration.SiteKey : null }));
        app.MapPost("/api/platform/contact", Submit).RequireRateLimiting(ContactRegistration.RatePolicy);
    }

    private static async Task<IResult> Submit(HttpContext context, ContactConfiguration configuration,
        PlatformConfiguration platform, ITurnstileVerifier captcha, IContactStore store)
    {
        if (!configuration.Configured) return Error("Message submission is temporarily unavailable. Please try later.", 503);
        if (!configuration.IsTrusted(context) || context.Request.Headers.Origin != platform.PublicOrigin.GetLeftPart(UriPartial.Authority))
            return Error("Submit your message from this website.", 403);
        var ip = configuration.ClientIp(context);
        if (ip is null) return Error("Your connection could not be verified. Please try again.", 400);
        if (!context.Request.HasJsonContentType()) return Error("Send a JSON message.", 415);
        if (context.Request.ContentLength > BodyLimit) return Error("Your message is too large.", 413);
        ContactRequest? request;
        try
        {
            using var body = new MemoryStream();
            var buffer = new byte[4096];
            int read;
            while ((read = await context.Request.Body.ReadAsync(buffer, context.RequestAborted)) > 0)
            {
                if (body.Length + read > BodyLimit) return Error("Your message is too large.", 413);
                body.Write(buffer, 0, read);
            }
            request = JsonSerializer.Deserialize<ContactRequest>(body.ToArray(), new JsonSerializerOptions(JsonSerializerDefaults.Web)
            { UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow });
        }
        catch (JsonException) { return Error("Check your message and try again.", 400); }
        catch (BadHttpRequestException) { return Error("Your message could not be read.", 400); }
        if (request is null || !Valid(request.Name, 100) || !Valid(request.Email, 254) ||
            !new EmailAddressAttribute().IsValid(request.Email!.Trim()) || !Valid(request.Subject, 160) ||
            !Valid(request.Message, 4000) || !Valid(request.CaptchaToken, 2048) || !string.IsNullOrEmpty(request.Website))
            return Error("Check the required fields and complete the security check.", 400);

        var token = request.CaptchaToken!.Trim();
        var verified = await captcha.Verify(token, ip, context.RequestAborted);
        if (verified == CaptchaResult.Unavailable) return Error("The security check is temporarily unavailable. Please try again.", 503);
        if (verified != CaptchaResult.Valid) return Error("The security check expired or failed. Please try again.", 400);
        var saved = await store.Save(new ContactMessage
        {
            Id = Guid.NewGuid(), Name = request.Name!.Trim(), Email = request.Email!.Trim(),
            Subject = request.Subject!.Trim(), Message = request.Message!.Trim(),
            CreatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            CaptchaTokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)))
        }, context.RequestAborted);
        return saved ? Results.Json(new { message = "Your message has been received. Our team will review it." }, statusCode: 201)
            : Error("This security check was already used. Please complete a new one.", 400);
    }

    private static bool Valid(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Length <= max &&
        !value.Any(character => char.IsControl(character) && character is not ('\r' or '\n' or '\t'));
    private static IResult Error(string message, int status) => Results.Json(new { error = message }, statusCode: status);
    private sealed record ContactRequest(string? Name, string? Email, string? Subject, string? Message, string? CaptchaToken, string? Website);
}
