using ProCoderJi.Api.Features.Contact;

namespace ProCoderJi.BrowserHost;

// Only the loopback test executable registers this verifier. It is never published with the API.
internal sealed class BrowserCaptchaVerifier : ITurnstileVerifier
{
    public Task<CaptchaResult> Verify(string token, string ip, CancellationToken cancellationToken) =>
        Task.FromResult(token.StartsWith("browser-fixture-valid-", StringComparison.Ordinal)
            ? CaptchaResult.Valid : CaptchaResult.Invalid);
}
