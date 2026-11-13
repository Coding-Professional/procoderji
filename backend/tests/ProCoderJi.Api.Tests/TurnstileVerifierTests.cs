using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Features.Contact;

namespace ProCoderJi.Api.Tests;

public sealed class TurnstileVerifierTests
{
    [Theory]
    [InlineData(true, "localhost", "contact", CaptchaResult.Valid)]
    [InlineData(false, "localhost", "contact", CaptchaResult.Invalid)]
    [InlineData(true, "evil.example", "contact", CaptchaResult.Invalid)]
    [InlineData(true, "localhost", "signin", CaptchaResult.Invalid)]
    [InlineData(true, "localhost", null, CaptchaResult.Invalid)]
    public async Task Checks_provider_success_hostname_and_action(bool success, string hostname, string? action, CaptchaResult expected)
    {
        using var handler = new ProviderHandler(new HttpResponseMessage(HttpStatusCode.OK)
        { Content = JsonContent.Create(new { success, hostname, action }) });
        using var client = new HttpClient(handler);
        var verifier = new TurnstileVerifier(client, Configuration());
        Assert.Equal(expected, await verifier.Verify("visitor-token", "192.0.2.1", default));
        Assert.Equal("https://challenges.cloudflare.com/turnstile/v0/siteverify", handler.Destination);
        Assert.Contains("response=visitor-token", handler.Body);
        Assert.Contains("remoteip=192.0.2.1", handler.Body);
        Assert.Contains("secret=test-secret-key", handler.Body);
    }

    [Fact]
    public async Task Malformed_or_unavailable_provider_fails_closed()
    {
        foreach (var response in new[] { new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("not json") } })
        {
            using var handler = new ProviderHandler(response);
            using var client = new HttpClient(handler);
            Assert.Equal(CaptchaResult.Unavailable, await new TurnstileVerifier(client, Configuration()).Verify("token", "192.0.2.1", default));
        }
    }

    [Theory]
    [InlineData("1x00000000000000000000AA", "test-secret-key")]
    [InlineData("test-site-key", "1x0000000000000000000000000000000AA")]
    public void Official_dummy_keys_cannot_enable_public_submission(string site, string secret)
    {
        var values = ContactIntegrationTests.Settings;
        values["Contact:TurnstileSiteKey"] = site; values["Contact:TurnstileSecretKey"] = secret;
        Assert.False(new ContactConfiguration(new ConfigurationBuilder().AddInMemoryCollection(values).Build(),
            new PlatformConfiguration(new Uri("https://procoderji.com"), false)).Configured);
    }

    private static ContactConfiguration Configuration() => new(new ConfigurationBuilder()
        .AddInMemoryCollection(ContactIntegrationTests.Settings).Build(), new PlatformConfiguration(new Uri("http://localhost:3000"), false));
    private sealed class ProviderHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        public string? Destination { get; private set; }
        public string? Body { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Destination = request.RequestUri?.AbsoluteUri;
            Body = await request.Content!.ReadAsStringAsync(cancellationToken);
            return response;
        }
    }
}
