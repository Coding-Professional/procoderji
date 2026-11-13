using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;
using ProCoderJi.Api.Features.Contact;

namespace ProCoderJi.Api.Tests;

public sealed class ContactIntegrationTests
{
    internal const string TestProxyKey = "test-only-internal-contact-proxy-key-123456789";
    internal static Dictionary<string, string?> Settings => new()
    {
        ["Contact:TurnstileSiteKey"] = "test-site-key", ["Contact:TurnstileSecretKey"] = "test-secret-key",
        ["Contact:ProxyKey"] = TestProxyKey
    };

    [Fact]
    public async Task Accepted_message_is_durable_private_and_captcha_replay_is_rejected()
    {
        using var factory = new PlatformFactory(overrides: Settings);
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddSingleton<ITurnstileVerifier>(new FakeCaptcha(CaptchaResult.Valid))));
        using var client = app.CreateClient();
        var config = await client.GetStringAsync("/api/platform/contact/config");
        Assert.Contains("test-site-key", config);
        Assert.DoesNotContain("test-secret-key", config);
        Assert.DoesNotContain(TestProxyKey, config);
        Trust(client);
        var concurrent = await Task.WhenAll(client.PostAsJsonAsync("/api/platform/contact", Payload()),
            client.PostAsJsonAsync("/api/platform/contact", Payload()));
        Assert.Single(concurrent, response => response.StatusCode == HttpStatusCode.Created);
        Assert.Single(concurrent, response => response.StatusCode == HttpStatusCode.BadRequest);
        // A fresh request scope proves that this was persisted rather than kept in endpoint memory.
        var rows = await Messages(app.Services);
        var saved = Assert.Single(rows);
        Assert.Equal("Student", saved.Name);
        Assert.Equal("student@example.test", saved.Email);
        Assert.Equal("Please add notes", saved.Message);
        Assert.Equal(64, saved.CaptchaTokenHash.Length);
        Assert.DoesNotContain("captcha-token", saved.CaptchaTokenHash);
        Assert.True(saved.CreatedAtUtc > 0);
        // Even a successful provider response on a reused token cannot create another row.
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/platform/contact", Payload())).StatusCode);
        var spacedToken = Payload(); spacedToken["captchaToken"] = " captcha-token ";
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/platform/contact", spacedToken)).StatusCode);
        Assert.Single(await Messages(app.Services));
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.GetAsync("/api/platform/contact")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/platform/contact/messages")).StatusCode);
    }

    [Theory]
    [InlineData(CaptchaResult.Invalid, HttpStatusCode.BadRequest)]
    [InlineData(CaptchaResult.Unavailable, HttpStatusCode.ServiceUnavailable)]
    public async Task Failed_security_check_never_saves(CaptchaResult result, HttpStatusCode status)
    {
        using var factory = new PlatformFactory(overrides: Settings);
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddSingleton<ITurnstileVerifier>(new FakeCaptcha(result))));
        using var client = app.CreateClient(); Trust(client);
        Assert.Equal(status, (await client.PostAsJsonAsync("/api/platform/contact", Payload())).StatusCode);
        Assert.Empty(await Messages(app.Services));
    }

    [Fact]
    public async Task Origin_proxy_validation_bounds_honeypot_and_rate_limit_are_enforced_before_captcha()
    {
        using var factory = new PlatformFactory(overrides: Settings);
        var captcha = new FakeCaptcha(CaptchaResult.Valid);
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.AddSingleton<ITurnstileVerifier>(captcha)));
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/platform/contact", Payload())).StatusCode);
        Trust(client);
        client.DefaultRequestHeaders.Remove("Origin"); client.DefaultRequestHeaders.Add("Origin", "https://other.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/platform/contact", Payload())).StatusCode);
        client.DefaultRequestHeaders.Remove("Origin"); client.DefaultRequestHeaders.Add("Origin", "http://localhost:3000");
        var invalid = Payload(); invalid["name"] = new string('x', 101);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/platform/contact", invalid)).StatusCode);
        invalid = Payload(); invalid["website"] = "https://spam.example";
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/platform/contact", invalid)).StatusCode);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.PostAsync("/api/platform/contact",
            new StringContent(new string('x', 33000), System.Text.Encoding.UTF8, "application/json"))).StatusCode);
        invalid = Payload(); invalid["email"] = "invalid";
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/platform/contact", invalid)).StatusCode);
        var limited = await client.PostAsJsonAsync("/api/platform/contact", Payload());
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.NotNull(limited.Headers.RetryAfter);
        Assert.Equal(0, captcha.Calls);
        Assert.Empty(await Messages(app.Services));
    }

    [Fact]
    public async Task Missing_configuration_fails_closed()
    {
        using var app = new PlatformFactory(overrides: new Dictionary<string, string?> { ["Contact:ProxyKey"] = "" });
        using var client = app.Browser();
        Assert.Contains("\"configured\":false", await client.GetStringAsync("/api/platform/contact/config"));
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.PostAsJsonAsync("/api/platform/contact", Payload())).StatusCode);
    }

    [Fact]
    public async Task Storage_failure_never_reports_success_or_echoes_private_content()
    {
        using var factory = new PlatformFactory(overrides: Settings);
        using var app = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.AddSingleton<ITurnstileVerifier>(new FakeCaptcha(CaptchaResult.Valid));
            services.AddSingleton<IContactStore, UnavailableStore>();
        }));
        using var client = app.CreateClient(); Trust(client);
        var response = await client.PostAsJsonAsync("/api/platform/contact", Payload());
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.Contains("could not be saved", text);
        Assert.DoesNotContain("student@example.test", text);
        Assert.Empty(await Messages(app.Services));
    }

    private static Dictionary<string, string> Payload() => new()
    {
        ["name"] = " Student ", ["email"] = "student@example.test", ["subject"] = "Notes request",
        ["message"] = "Please add notes", ["captchaToken"] = "captcha-token", ["website"] = ""
    };
    private static void Trust(HttpClient client)
    {
        client.DefaultRequestHeaders.Add("Origin", "http://localhost:3000");
        client.DefaultRequestHeaders.Add("X-Contact-Proxy-Key", TestProxyKey);
        client.DefaultRequestHeaders.Add("X-Contact-Client-IP", "192.0.2.1");
    }
    private static async Task<List<ContactMessage>> Messages(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        if (scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>()["Database:Provider"] == "MongoDb")
            return await scope.ServiceProvider.GetRequiredService<MongoPlatformDatabase>().ContactMessages.Find(_ => true).ToListAsync();
        var database = scope.ServiceProvider.GetRequiredService<PlatformDbContext>();
        if (database.Database.IsNpgsql())
        {
            var connection = database.Database.GetDbConnection();
            var searchPath = new Npgsql.NpgsqlConnectionStringBuilder(connection.ConnectionString).SearchPath;
            Assert.StartsWith("procoderji_test_", searchPath);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand(); command.CommandText = "SELECT current_schema()";
            Assert.Equal(searchPath, await command.ExecuteScalarAsync());
        }
        return await database.ContactMessages.AsNoTracking().ToListAsync();
    }
    private sealed class FakeCaptcha(CaptchaResult result) : ITurnstileVerifier
    {
        public int Calls { get; private set; }
        public Task<CaptchaResult> Verify(string token, string ip, CancellationToken cancellationToken)
        { Calls++; return Task.FromResult(result); }
    }
    private sealed class UnavailableStore : IContactStore
    {
        public Task<bool> Save(ContactMessage message, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Test-only unavailable store");
    }
}
