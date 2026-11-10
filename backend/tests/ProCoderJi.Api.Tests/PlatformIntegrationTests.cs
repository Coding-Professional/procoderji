using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ProCoderJi.Api.Tests;

public sealed class PlatformIntegrationTests
{
    private static readonly Guid UserA = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    private static readonly Guid UserB = Guid.Parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Missing_google_configuration_preserves_guest_mode_and_does_not_trust_test_headers()
    {
        using var factory = new PlatformFactory(testAuthentication: false);
        using var browser = factory.Browser(UserA);
        var session = await Session(browser);
        Assert.False(session.GetProperty("configured").GetBoolean());
        Assert.Equal(JsonValueKind.Null, session.GetProperty("user").ValueKind);
        Assert.NotEmpty(session.GetProperty("csrfToken").GetString()!);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await browser.GetAsync("/api/platform/auth/google?returnTo=/learn")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/platform/progress")).StatusCode);
    }

    [Theory]
    [InlineData("http://localhost:3000")]
    [InlineData("https://students.example.test")]
    public async Task Google_challenge_uses_frontend_callback_and_rejects_external_return_targets(string origin)
    {
        using var factory = new PlatformFactory(googleConfigured: true, publicOrigin: origin);
        using var browser = factory.Browser();
        var response = await browser.GetAsync("/api/platform/auth/google?returnTo=" + Uri.EscapeDataString("//evil.example/test"));
        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        var location = response.Headers.Location!;
        Assert.Equal("accounts.google.com", location.Host);
        var query = QueryHelpers.ParseQuery(location.Query);
        Assert.Equal(origin + "/api/platform/signin-google", query["redirect_uri"].ToString());
        var options = factory.Services.GetRequiredService<IOptionsMonitor<GoogleOptions>>().Get("Google");
        var properties = options.StateDataFormat.Unprotect(query["state"].ToString());
        Assert.Equal(origin + "/learn", properties!.RedirectUri);
        Assert.DoesNotContain(":0/", query["redirect_uri"].ToString());
    }

    [Fact]
    public async Task Progress_is_isolated_and_the_same_guest_uuid_can_be_imported_by_two_accounts()
    {
        using var factory = new PlatformFactory();
        using var first = factory.Browser(UserA);
        using var second = factory.Browser(UserB);
        var firstToken = (await Session(first)).GetProperty("csrfToken").GetString()!;
        var secondToken = (await Session(second)).GetProperty("csrfToken").GetString()!;
        var firstState = await Progress(first, UserA);
        var secondState = await Progress(second, UserB);
        var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.OK, (await Write(first, HttpMethod.Post, UserA, firstToken, new { attempts = new[] { Attempt(id) }, generation = firstState.GetProperty("generation").GetString() })).StatusCode);
        Assert.Empty((await Progress(second, UserB)).GetProperty("attempts").EnumerateArray());
        Assert.Equal(HttpStatusCode.OK, (await Write(second, HttpMethod.Post, UserB, secondToken, new { attempts = new[] { Attempt(id) }, generation = secondState.GetProperty("generation").GetString() })).StatusCode);
        Assert.Single((await Progress(first, UserA)).GetProperty("attempts").EnumerateArray());
        Assert.Single((await Progress(second, UserB)).GetProperty("attempts").EnumerateArray());
        Assert.Equal(HttpStatusCode.Conflict, (await Write(first, HttpMethod.Post, UserB, firstToken, new { attempts = Array.Empty<object>(), generation = firstState.GetProperty("generation").GetString() })).StatusCode);
    }

    [Fact]
    public async Task Cookie_mutations_require_same_origin_and_valid_antiforgery_tokens()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = (await Session(browser)).GetProperty("csrfToken").GetString()!;
        var generation = (await Progress(browser, UserA)).GetProperty("generation").GetString();
        var body = new { attempts = new[] { Attempt(Guid.NewGuid()) }, generation };
        Assert.Equal(HttpStatusCode.Forbidden, (await Write(browser, HttpMethod.Post, UserA, null, body)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Write(browser, HttpMethod.Post, UserA, token, body, "https://evil.example")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Write(browser, HttpMethod.Post, UserA, token, body)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Write(browser, HttpMethod.Post, UserA, null, null, path: "/api/platform/auth/logout")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Write(browser, HttpMethod.Post, UserA, token, null, path: "/api/platform/auth/logout")).StatusCode);
    }

    [Fact]
    public async Task Reset_rotates_generation_and_rejects_old_uploads_and_retries_are_immutable()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = (await Session(browser)).GetProperty("csrfToken").GetString()!;
        var generation = (await Progress(browser, UserA)).GetProperty("generation").GetString();
        var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.OK, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = new[] { Attempt(id, "a") }, generation })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = new[] { Attempt(id, "b") }, generation })).StatusCode);
        var saved = (await Progress(browser, UserA)).GetProperty("attempts").EnumerateArray().Single();
        Assert.Equal("a", saved.GetProperty("responses")[0].GetProperty("optionId").GetString());
        var reset = await Write(browser, HttpMethod.Delete, UserA, token, null);
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        var changed = (await reset.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("generation").GetString();
        Assert.NotEqual(generation, changed);
        Assert.Empty((await Progress(browser, UserA)).GetProperty("attempts").EnumerateArray());
        Assert.Equal(HttpStatusCode.Conflict, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = new[] { Attempt(id) }, generation })).StatusCode);
    }

    [Fact]
    public async Task Cloud_history_retains_newest_100_and_invalid_or_claimed_score_payloads_are_rejected()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = (await Session(browser)).GetProperty("csrfToken").GetString()!;
        var generation = (await Progress(browser, UserA)).GetProperty("generation").GetString();
        Assert.Equal(HttpStatusCode.OK, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = Enumerable.Range(0, 100).Select(_ => Attempt(Guid.NewGuid())).ToArray(), generation })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = Enumerable.Range(0, 10).Select(_ => Attempt(Guid.NewGuid())).ToArray(), generation })).StatusCode);
        Assert.Equal(100, (await Progress(browser, UserA)).GetProperty("attempts").GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = Enumerable.Range(0, 101).Select(_ => Attempt(Guid.NewGuid())).ToArray(), generation })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = new[] { new { id = Guid.NewGuid(), completedAt = "2026-11-01T10:00:00.000Z", topicId = "quantitative", questionIds = new[] { "unknown-question" }, responses = Array.Empty<object>(), durationSeconds = 1 } }, generation })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Write(browser, HttpMethod.Post, UserA, token, new { attempts = new[] { new { id = Guid.NewGuid(), scorePercent = 100 } }, generation })).StatusCode);
    }

    private static object Attempt(Guid id, string option = "a") => new { id, completedAt = "2026-11-01T10:00:00.000Z", topicId = "quantitative", questionIds = new[] { "quant-discount-price" }, responses = new[] { new { questionId = "quant-discount-price", optionId = option } }, durationSeconds = 10 };
    private static async Task<JsonElement> Session(HttpClient browser) => await browser.GetFromJsonAsync<JsonElement>("/api/platform/auth/session", Json);
    private static async Task<JsonElement> Progress(HttpClient browser, Guid user)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/platform/progress");
        request.Headers.Add("x-account-id", user.ToString());
        using var response = await browser.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }
    private static Task<HttpResponseMessage> Write(HttpClient browser, HttpMethod method, Guid user, string? token, object? body, string origin = "http://localhost:3000", string path = "/api/platform/progress")
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Add("x-account-id", user.ToString());
        request.Headers.Add("Origin", origin);
        if (token is not null) request.Headers.Add("X-CSRF-Token", token);
        if (body is not null) request.Content = JsonContent.Create(body, options: Json);
        return browser.SendAsync(request);
    }
}
