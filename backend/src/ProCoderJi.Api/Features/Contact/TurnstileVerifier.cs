using System.Text.Json.Serialization;

namespace ProCoderJi.Api.Features.Contact;

public enum CaptchaResult { Valid, Invalid, Unavailable }
public interface ITurnstileVerifier
{
    Task<CaptchaResult> Verify(string token, string ip, CancellationToken cancellationToken);
}

public sealed class TurnstileVerifier(HttpClient client, ContactConfiguration configuration) : ITurnstileVerifier
{
    public async Task<CaptchaResult> Verify(string token, string ip, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await client.PostAsync("https://challenges.cloudflare.com/turnstile/v0/siteverify",
                new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["secret"] = configuration.SecretKey, ["response"] = token, ["remoteip"] = ip
                }), cancellationToken);
            if (!response.IsSuccessStatusCode) return CaptchaResult.Unavailable;
            var result = await response.Content.ReadFromJsonAsync<Verification>(cancellationToken);
            return result is { Success: true, Action: "contact" } &&
                string.Equals(result.Hostname, configuration.Hostname, StringComparison.OrdinalIgnoreCase)
                ? CaptchaResult.Valid : CaptchaResult.Invalid;
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            // Never log the request body, secret, token, or visitor's message.
            return CaptchaResult.Unavailable;
        }
    }

    private sealed record Verification(
        [property: JsonPropertyName("success")] bool Success,
        [property: JsonPropertyName("hostname")] string? Hostname,
        [property: JsonPropertyName("action")] string? Action);
}
