using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Tests;

public sealed class PortfolioIntegrationTests
{
    private static readonly Guid UserA = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    private static readonly Guid UserB = Guid.Parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly IReadOnlyDictionary<string, string?> Publishing = new Dictionary<string, string?> { ["Portfolio:PublishingEnabled"] = "true" };

    [Fact]
    public async Task Anonymous_requests_cannot_read_drafts_claim_names_or_mutate_portfolios()
    {
        using var factory = new PlatformFactory(testAuthentication: false, overrides: Publishing);
        using var browser = factory.Browser(UserA);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Read(browser, UserA)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Read(browser, UserA, "/api/platform/portfolio/username?username=riya-student")).StatusCode);
        foreach (var path in new[] { "draft", "username", "publish", "unpublish" })
            Assert.Equal(HttpStatusCode.Unauthorized, await Status(browser, UserA, null, new { revision = (Guid?)null }, path));
        Assert.Equal(HttpStatusCode.Unauthorized, await Status(browser, UserA, null, new { revision = Guid.NewGuid() }, "", HttpMethod.Delete));
        Assert.Equal(HttpStatusCode.NotFound, (await browser.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
    }

    [Fact]
    public async Task Mutations_validate_identity_antiforgery_payload_and_shared_field_rules()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = await Token(browser);
        var valid = new { data = Data("Riya"), searchVisible = false, revision = (Guid?)null };
        Assert.Equal(HttpStatusCode.Forbidden, await Status(browser, UserA, null, valid, "draft"));
        Assert.Equal(HttpStatusCode.Forbidden, await Status(browser, UserA, token, valid, "draft", origin: "https://other.example"));
        Assert.Equal(HttpStatusCode.Conflict, await Status(browser, UserB, token, valid, "draft"));
        Assert.Equal(HttpStatusCode.BadRequest, await Status(browser, UserA, token, new { data = Data("Riya"), searchVisible = false }, "draft"));
        Assert.Equal(HttpStatusCode.BadRequest, await Status(browser, UserA, token, new { data = Data("Riya"), searchVisible = false, revision = (Guid?)null, userId = UserB }, "draft"));
        Assert.Equal(HttpStatusCode.BadRequest, await Status(browser, UserA, token, new { data = Data("Riya"), searchVisible = false, revision = Guid.Empty }, "draft"));
        using var invalid = await Write(browser, UserA, token, new { data = new { name = "Riya", links = new { website = "javascript:alert(1)" } }, searchVisible = false, revision = (Guid?)null }, "draft");
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var errors = await invalid.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Contains(errors.GetProperty("problems").EnumerateArray(), problem => problem.GetProperty("path").GetString() == "links.website" && problem.GetProperty("code").GetString() == "invalid-link");
        using var name = await Read(browser, UserA, "/api/platform/portfolio/username?username=admin");
        Assert.Equal(HttpStatusCode.BadRequest, name.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Owner(browser, UserA)).GetProperty("portfolio").ValueKind);
    }

    [Fact]
    public async Task Declared_and_chunked_oversized_bodies_are_rejected_before_deserialization()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = await Token(browser);
        foreach (var unknownLength in new[] { false, true })
        {
            using var request = Request(UserA, token, "draft", HttpMethod.Post);
            var text = new string(' ', 256 * 1024 + 1);
            request.Content = unknownLength ? new UnknownLengthJsonContent(text) : new StringContent(text, Encoding.UTF8, "application/json");
            using var response = await browser.SendAsync(request);
            Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        }
        using var plain = Request(UserA, token, "draft", HttpMethod.Post);
        plain.Content = new StringContent("{}", Encoding.UTF8, "text/plain");
        using var plainResponse = await browser.SendAsync(plain);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, plainResponse.StatusCode);
    }

    [Fact]
    public async Task Malformed_UTF16_in_metadata_and_property_names_returns_a_client_error()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = await Token(browser);
        foreach (var hex in new[] { "d800", "dc00" })
        {
            var escaped = (char)92 + "u" + hex;
            foreach (var (action, body) in new[]
            {
                ("username", "{\"username\":\"" + escaped + "\",\"revision\":null}"),
                ("draft", "{\"data\":{},\"searchVisible\":false,\"revision\":null,\"" + escaped + "\":1}"),
                ("draft", "{\"data\":{\"name\":\"" + escaped + "\"},\"searchVisible\":false,\"revision\":null}")
            })
            {
                using var request = Request(UserA, token, action, HttpMethod.Post);
                request.Content = new StringContent(body, Encoding.UTF8, "application/json");
                using var response = await browser.SendAsync(request);
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            }
        }
        Assert.Equal(JsonValueKind.Null, (await Owner(browser, UserA)).GetProperty("portfolio").ValueKind);
    }

    [Fact]
    public async Task Drafts_remain_private_and_publication_uses_an_explicit_snapshot()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var owner = factory.Browser(UserA);
        using var other = factory.Browser(UserB);
        using var anonymous = factory.Browser();
        var token = await Token(owner);
        await Token(other);
        var draft = await Change(owner, UserA, token, new { data = Data("Published name"), searchVisible = false, revision = (Guid?)null }, "draft");
        Assert.Equal(JsonValueKind.Null, (await Owner(other, UserB)).GetProperty("portfolio").ValueKind);
        Assert.Equal(HttpStatusCode.Conflict, await Status(other, UserA, token, new { revision = Revision(draft) }, "publish"));
        var claimed = await Change(owner, UserA, token, new { username = "riya-student", revision = Revision(draft) }, "username");
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
        var published = await Change(owner, UserA, token, new { revision = Revision(claimed) }, "publish");
        var edited = await Change(owner, UserA, token, new { data = Data("Private edit"), searchVisible = true, revision = Revision(published) }, "draft");
        Assert.Equal("published", edited.GetProperty("status").GetString());
        using (var response = await anonymous.GetAsync("/api/platform/portfolio/public/riya-student"))
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag"));
            Assert.True(response.Headers.CacheControl!.NoStore);
            var visible = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
            Assert.Equal("Published name", visible.GetProperty("data").GetProperty("name").GetString());
            Assert.False(visible.GetProperty("searchVisible").GetBoolean());
            Assert.False(visible.TryGetProperty("userId", out _));
            Assert.False(visible.TryGetProperty("revision", out _));
            Assert.False(visible.TryGetProperty("updatedAt", out _));
            Assert.DoesNotContain("Private edit", visible.ToString());
        }
        var republished = await Change(owner, UserA, token, new { revision = Revision(edited) }, "publish");
        var fresh = await anonymous.GetFromJsonAsync<JsonElement>("/api/platform/portfolio/public/riya-student", Json);
        Assert.Equal("Private edit", fresh.GetProperty("data").GetProperty("name").GetString());
        Assert.True(fresh.GetProperty("searchVisible").GetBoolean());
        var hidden = await Change(owner, UserA, token, new { revision = Revision(republished) }, "unpublish");
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, await Status(owner, UserA, token, new { revision = Revision(hidden) }, "", HttpMethod.Delete));
        Assert.Equal(JsonValueKind.Null, (await Owner(owner, UserA)).GetProperty("portfolio").ValueKind);
    }

    [Fact]
    public async Task Publishing_is_disabled_by_default_while_drafts_remain_usable()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        using var anonymous = factory.Browser();
        var token = await Token(browser);
        var saved = await Change(browser, UserA, token, new { data = Data("Riya"), searchVisible = false, revision = (Guid?)null }, "draft");
        var claimed = await Change(browser, UserA, token, new { username = "riya-student", revision = Revision(saved) }, "username");
        using var response = await Write(browser, UserA, token, new { revision = Revision(claimed) }, "publish");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("publishing-disabled", (await response.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("code").GetString());
        Assert.False((await Owner(browser, UserA)).GetProperty("publishingEnabled").GetBoolean());
        using var scope = factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IPortfolioStore>().Publish(UserA, Revision(claimed), default);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
    }

    [Fact]
    public async Task Publish_requires_complete_data_and_a_claimed_username()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var browser = factory.Browser(UserA);
        var token = await Token(browser);
        var incomplete = await Change(browser, UserA, token, new { data = new { about = "Work in progress" }, searchVisible = false, revision = (Guid?)null }, "draft");
        Assert.Equal(HttpStatusCode.BadRequest, await Status(browser, UserA, token, new { revision = Revision(incomplete) }, "publish"));
        var complete = await Change(browser, UserA, token, new { data = Data("Riya"), searchVisible = false, revision = Revision(incomplete) }, "draft");
        using var response = await Write(browser, UserA, token, new { revision = Revision(complete) }, "publish");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("username-required", (await response.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Concurrent_username_claims_have_one_owner_and_claimed_names_cannot_change()
    {
        using var factory = new PlatformFactory();
        using var first = factory.Browser(UserA);
        using var second = factory.Browser(UserB);
        var firstToken = await Token(first);
        var secondToken = await Token(second);
        var results = await Task.WhenAll(
            Write(first, UserA, firstToken, new { username = "riya-student", revision = (Guid?)null }, "username"),
            Write(second, UserB, secondToken, new { username = "riya-student", revision = (Guid?)null }, "username"));
        try
        {
            Assert.Equal(new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }, results.Select(response => response.StatusCode).Order().ToArray());
            var winner = results[0].StatusCode == HttpStatusCode.OK ? first : second;
            var winnerId = results[0].StatusCode == HttpStatusCode.OK ? UserA : UserB;
            var winnerToken = results[0].StatusCode == HttpStatusCode.OK ? firstToken : secondToken;
            var record = (await Owner(winner, winnerId)).GetProperty("portfolio");
            using var changed = await Write(winner, winnerId, winnerToken, new { username = "another-student", revision = Revision(record) }, "username");
            Assert.Equal(HttpStatusCode.Conflict, changed.StatusCode);
            Assert.Equal("username-locked", (await changed.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("code").GetString());
        }
        finally { foreach (var response in results) response.Dispose(); }
    }

    [Fact]
    public async Task Concurrent_draft_updates_reject_the_stale_revision()
    {
        using var factory = new PlatformFactory();
        using var browser = factory.Browser(UserA);
        var token = await Token(browser);
        var initial = await Change(browser, UserA, token, new { data = Data("Initial"), searchVisible = false, revision = (Guid?)null }, "draft");
        var revision = Revision(initial);
        var results = await Task.WhenAll(
            Write(browser, UserA, token, new { data = Data("First"), searchVisible = false, revision }, "draft"),
            Write(browser, UserA, token, new { data = Data("Second"), searchVisible = false, revision }, "draft"));
        try { Assert.Equal(new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }, results.Select(response => response.StatusCode).Order().ToArray()); }
        finally { foreach (var response in results) response.Dispose(); }
        var final = (await Owner(browser, UserA)).GetProperty("portfolio");
        Assert.NotEqual(revision, Revision(final));
        Assert.Contains(final.GetProperty("data").GetProperty("name").GetString()!, new[] { "First", "Second" });
    }

    [Fact]
    public async Task Suspension_hides_public_data_and_cannot_be_bypassed_by_unpublishing()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var browser = factory.Browser(UserA);
        using var anonymous = factory.Browser();
        var token = await Token(browser);
        var draft = await Change(browser, UserA, token, new { data = Data("Riya"), searchVisible = false, revision = (Guid?)null }, "draft");
        var claimed = await Change(browser, UserA, token, new { username = "riya-student", revision = Revision(draft) }, "username");
        await Change(browser, UserA, token, new { revision = Revision(claimed) }, "publish");
        await Suspend(factory, UserA);
        var suspended = (await Owner(browser, UserA)).GetProperty("portfolio");
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, await Status(browser, UserA, token, new { revision = Revision(suspended) }, "publish"));
        Assert.Equal(HttpStatusCode.Forbidden, await Status(browser, UserA, token, new { revision = Revision(suspended) }, "", HttpMethod.Delete));
        var edited = await Change(browser, UserA, token, new { data = Data("Corrected"), searchVisible = false, revision = Revision(suspended) }, "draft");
        Assert.Equal("suspended", edited.GetProperty("status").GetString());
        var hidden = await Change(browser, UserA, token, new { revision = Revision(edited) }, "unpublish");
        Assert.Equal("suspended", hidden.GetProperty("status").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, await Status(browser, UserA, token, new { revision = Revision(hidden) }, "publish"));
    }

    [Fact]
    public async Task Deleting_the_account_removes_its_private_and_published_portfolio()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var browser = factory.Browser(UserA);
        using var anonymous = factory.Browser();
        var token = await Token(browser);
        var saved = await Change(browser, UserA, token, new { data = Data("Riya"), searchVisible = true, revision = (Guid?)null }, "draft");
        var claimed = await Change(browser, UserA, token, new { username = "riya-student", revision = Revision(saved) }, "username");
        await Change(browser, UserA, token, new { revision = Revision(claimed) }, "publish");
        using var scope = factory.Services.CreateScope();
        if (Mongo(scope.ServiceProvider))
            await scope.ServiceProvider.GetRequiredService<MongoPlatformDatabase>().Users.DeleteOneAsync(user => user.Id == UserA.ToString("D"));
        else
        {
            await using var db = await scope.ServiceProvider.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync();
            db.Users.Remove(await db.Users.SingleAsync(user => user.Id == UserA));
            await db.SaveChangesAsync();
        }
        Assert.Null(await scope.ServiceProvider.GetRequiredService<IPortfolioStore>().GetOwner(UserA, default));
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/riya-student")).StatusCode);
    }

    [Fact]
    public async Task Write_and_username_limits_are_separate_and_partitioned_by_authenticated_identity()
    {
        using var factory = new PlatformFactory();
        using var first = factory.Browser(UserA);
        using var second = factory.Browser(UserB);
        var firstToken = await Token(first);
        var secondToken = await Token(second);
        for (var i = 0; i < 10; i++)
            Assert.Equal(HttpStatusCode.BadRequest, await Status(first, UserA, firstToken, new { data = new { html = "unexpected" }, searchVisible = false, revision = (Guid?)null }, "draft"));
        using (var limited = await Write(first, UserA, firstToken, new { data = Data("Riya"), searchVisible = false, revision = (Guid?)null }, "draft"))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
            Assert.True(limited.Headers.RetryAfter!.Delta > TimeSpan.Zero);
        }
        Assert.Equal(HttpStatusCode.OK, await Status(second, UserB, secondToken, new { data = Data("Other"), searchVisible = false, revision = (Guid?)null }, "draft"));
        for (var i = 0; i < 30; i++)
        {
            using var available = await Read(first, UserA, "/api/platform/portfolio/username?username=riya-student");
            Assert.Equal(HttpStatusCode.OK, available.StatusCode);
        }
        using var check = await Read(first, UserA, "/api/platform/portfolio/username?username=riya-student");
        Assert.Equal(HttpStatusCode.TooManyRequests, check.StatusCode);
        Assert.True(check.Headers.RetryAfter!.Delta > TimeSpan.Zero);
        using var other = await Read(second, UserB, "/api/platform/portfolio/username?username=riya-student");
        Assert.Equal(HttpStatusCode.OK, other.StatusCode);
    }

    private static object Data(string name) => new { name, headline = "Student developer", about = "My original projects" };
    private static Guid Revision(JsonElement portfolio) => portfolio.GetProperty("revision").GetGuid();
    private static bool Mongo(IServiceProvider services) => services.GetRequiredService<IConfiguration>()["Database:Provider"] == "MongoDb";

    private static async Task Suspend(PlatformFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        if (Mongo(scope.ServiceProvider))
        {
            var database = scope.ServiceProvider.GetRequiredService<MongoPlatformDatabase>();
            await database.Users.UpdateOneAsync(user => user.Id == id.ToString("D"), Builders<MongoUserDocument>.Update
                .Set(user => user.Portfolio!.Status, PortfolioStatus.Suspended).Set(user => user.Portfolio!.Revision, Guid.NewGuid().ToString("D")));
        }
        else
        {
            await using var db = await scope.ServiceProvider.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync();
            var portfolio = await db.Portfolios.SingleAsync(portfolio => portfolio.UserId == id);
            portfolio.Status = PortfolioStatus.Suspended;
            portfolio.Revision = Guid.NewGuid();
            await db.SaveChangesAsync();
        }
    }

    private static async Task<string> Token(HttpClient browser) => (await browser.GetFromJsonAsync<JsonElement>("/api/platform/auth/session", Json)).GetProperty("csrfToken").GetString()!;
    private static async Task<JsonElement> Owner(HttpClient browser, Guid user)
    {
        using var response = await Read(browser, user);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }
    private static Task<HttpResponseMessage> Read(HttpClient browser, Guid user, string path = "/api/platform/portfolio")
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("x-account-id", user.ToString());
        return browser.SendAsync(request);
    }
    private static HttpRequestMessage Request(Guid user, string? token, string action, HttpMethod method, string origin = "http://localhost:3000")
    {
        var request = new HttpRequestMessage(method, "/api/platform/portfolio" + (action.Length == 0 ? "" : "/" + action));
        request.Headers.Add("x-account-id", user.ToString());
        request.Headers.Add("Origin", origin);
        if (token is not null) request.Headers.Add("X-CSRF-Token", token);
        return request;
    }
    private static Task<HttpResponseMessage> Write(HttpClient browser, Guid user, string? token, object body, string action, HttpMethod? method = null, string origin = "http://localhost:3000")
    {
        var request = Request(user, token, action, method ?? HttpMethod.Post, origin);
        if (action == "publish")
        {
            var publish = JsonSerializer.SerializeToNode(body, Json)!.AsObject();
            if (!publish.ContainsKey("eligibility"))
                publish["eligibility"] = JsonSerializer.SerializeToNode(new { atLeast18 = true, policyVersion = PortfolioPublishingPolicy.Version }, Json);
            body = publish;
        }
        request.Content = JsonContent.Create(body, options: Json);
        return browser.SendAsync(request);
    }
    private static async Task<HttpStatusCode> Status(HttpClient browser, Guid user, string? token, object body, string action, HttpMethod? method = null, string origin = "http://localhost:3000")
    {
        using var response = await Write(browser, user, token, body, action, method, origin);
        return response.StatusCode;
    }
    private static async Task<JsonElement> Change(HttpClient browser, Guid user, string token, object body, string action)
    {
        using var response = await Write(browser, user, token, body, action);
        var value = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(response.IsSuccessStatusCode, $"{action}: {(int)response.StatusCode} {value}");
        return value.GetProperty("portfolio");
    }

    private sealed class UnknownLengthJsonContent : HttpContent
    {
        private readonly byte[] bytes;
        public UnknownLengthJsonContent(string text)
        {
            bytes = Encoding.UTF8.GetBytes(text);
            Headers.ContentType = new MediaTypeHeaderValue("application/json");
        }
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => stream.WriteAsync(bytes).AsTask();
        protected override bool TryComputeLength(out long length) { length = 0; return false; }
    }
}
