using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Tests;

public sealed class PortfolioPublicationTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly IReadOnlyDictionary<string, string?> Publishing = new Dictionary<string, string?>
    {
        ["Portfolio:PublishingEnabled"] = "true"
    };

    [Fact]
    public async Task Publish_requires_an_explicit_current_age_and_policy_confirmation_and_stores_no_birth_date()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        var seeded = await Seed(factory.Services, "policy-student", true);
        using var owner = factory.Browser(seeded.UserId);
        var csrf = await Token(owner);
        (object Body, HttpStatusCode Status)[] invalid =
        [
            (new { revision = seeded.Record.Revision }, HttpStatusCode.BadRequest),
            (new { revision = seeded.Record.Revision, eligibility = (object?)null }, HttpStatusCode.BadRequest),
            (new { revision = seeded.Record.Revision, eligibility = new { atLeast18 = false, policyVersion = PortfolioPublishingPolicy.Version } }, HttpStatusCode.BadRequest),
            (new { revision = seeded.Record.Revision, eligibility = new { atLeast18 = true, policyVersion = "outdated" } }, HttpStatusCode.Conflict),
            (new { revision = seeded.Record.Revision, eligibility = new { atLeast18 = true } }, HttpStatusCode.BadRequest),
            (new { revision = seeded.Record.Revision, eligibility = new { atLeast18 = true, policyVersion = PortfolioPublishingPolicy.Version, birthDate = "2000-01-01" } }, HttpStatusCode.BadRequest),
            (new { revision = seeded.Record.Revision, eligibility = new { atLeast18 = "true", policyVersion = PortfolioPublishingPolicy.Version } }, HttpStatusCode.BadRequest)
        ];
        foreach (var entry in invalid)
        {
            using var response = await Write(owner, seeded.UserId, csrf, "publish", entry.Body);
            Assert.Equal(entry.Status, response.StatusCode);
            var current = await Own(factory.Services, seeded.UserId);
            Assert.Equal(PortfolioStatus.Draft, current.Status);
            Assert.Null(current.PublishedJson);
            Assert.Null(current.PublishingPolicyVersion);
            Assert.Null(current.EligibilityConfirmedAtUtc);
        }

        var before = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        using var published = await Write(owner, seeded.UserId, csrf, "publish", new
        {
            revision = seeded.Record.Revision,
            eligibility = new { atLeast18 = true, policyVersion = PortfolioPublishingPolicy.Version }
        });
        Assert.Equal(HttpStatusCode.OK, published.StatusCode);
        var accepted = await Own(factory.Services, seeded.UserId);
        Assert.Equal(PortfolioPublishingPolicy.Version, accepted.PublishingPolicyVersion);
        Assert.InRange(accepted.EligibilityConfirmedAtUtc!.Value, before, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        using var anonymous = factory.Browser();
        var publicData = await ReadJson(anonymous, "/api/platform/portfolio/public/policy-student");
        Assert.False(publicData.TryGetProperty("publishingPolicyVersion", out _));
        Assert.False(publicData.TryGetProperty("eligibilityConfirmedAt", out _));
        Assert.DoesNotContain("birthDate", publicData.GetRawText());
    }

    [Fact]
    public async Task Public_state_and_versioned_snapshots_never_reveal_drafts_and_reject_an_obsolete_public_version()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        var seeded = await Seed(factory.Services, "snapshot-student", false, PortfolioPublishingPolicy.Version);
        using var anonymous = factory.Browser();
        using var stateResponse = await anonymous.GetAsync("/api/platform/portfolio/public/snapshot-student/state");
        Assert.Equal(HttpStatusCode.OK, stateResponse.StatusCode);
        Assert.True(stateResponse.Headers.CacheControl!.NoStore);
        Assert.Contains("noindex", stateResponse.Headers.GetValues("X-Robots-Tag"));
        var state = await stateResponse.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(new[] { "publishedAt", "searchVisible", "username", "version" }, state.EnumerateObject().Select(property => property.Name).Order().ToArray());
        var version = state.GetProperty("version").GetString()!;
        Assert.Matches("^[0-9a-f]{64}$", version);
        Assert.False(state.GetProperty("searchVisible").GetBoolean());

        using var scope = factory.Services.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<IPortfolioStore>();
        var edited = await store.SaveDraft(seeded.UserId, seeded.Record.Revision,
            "{\"name\":\"Private replacement\",\"headline\":\"Student\",\"theme\":\"developer\"}", true, default);
        var unchangedState = await ReadJson(anonymous, "/api/platform/portfolio/public/snapshot-student/state");
        Assert.Equal(version, unchangedState.GetProperty("version").GetString());
        Assert.False(unchangedState.GetProperty("searchVisible").GetBoolean());
        Assert.DoesNotContain("Private replacement", unchangedState.GetRawText());
        var snapshot = await ReadJson(anonymous, "/api/platform/portfolio/public/snapshot-student?version=" + version);
        Assert.Equal("Riya", snapshot.GetProperty("data").GetProperty("name").GetString());
        Assert.False(snapshot.TryGetProperty("revision", out _));
        Assert.False(snapshot.TryGetProperty("userId", out _));

        var republished = await store.Publish(seeded.UserId, edited.Revision, default, PortfolioPublishingPolicy.Version);
        var currentState = await ReadJson(anonymous, "/api/platform/portfolio/public/snapshot-student/state");
        var currentVersion = currentState.GetProperty("version").GetString();
        Assert.NotEqual(version, currentVersion);
        Assert.True(currentState.GetProperty("searchVisible").GetBoolean());
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/snapshot-student?version=" + version)).StatusCode);
        var current = await ReadJson(anonymous, "/api/platform/portfolio/public/snapshot-student?version=" + currentVersion);
        Assert.Equal("Private replacement", current.GetProperty("data").GetProperty("name").GetString());
        Assert.Equal("developer", current.GetProperty("data").GetProperty("theme").GetString());

        await store.Unpublish(seeded.UserId, republished.Revision, default);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/snapshot-student/state")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public/snapshot-student?version=" + currentVersion)).StatusCode);
    }

    [Fact]
    public async Task Public_index_pages_only_current_policy_published_and_opted_in_portfolios()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        await Seed(factory.Services, "alpha-student", true, PortfolioPublishingPolicy.Version);
        await Seed(factory.Services, "bravo-student", false, PortfolioPublishingPolicy.Version);
        await Seed(factory.Services, "charlie-student", true);
        await Seed(factory.Services, "delta-student", true, PortfolioPublishingPolicy.Version);
        await Seed(factory.Services, "echo-student", true, legacyPublish: true);
        await Seed(factory.Services, "foxtrot-student", true, PortfolioPublishingPolicy.Version);
        await Seed(factory.Services, "golf-student", true, PortfolioPublishingPolicy.Version);
        await Seed(factory.Services, "hotel-student", true, "previous-policy");
        using var operatorOutput = new StringWriter();
        using var operatorError = new StringWriter();
        Assert.Equal(0, await PortfolioModerationCommand.TryRun(
            ["--portfolio", "suspend", "--username", "delta-student"], factory.Services, output: operatorOutput, error: operatorError));
        using var anonymous = factory.Browser();

        var names = new List<string>();
        string? cursor = null;
        foreach (var expected in new[] { "alpha-student", "foxtrot-student", "golf-student" })
        {
            var page = await ReadJson(anonymous, "/api/platform/portfolio/public?limit=1" + (cursor is null ? "" : "&after=" + cursor));
            var row = Assert.Single(page.GetProperty("portfolios").EnumerateArray());
            Assert.Equal(new[] { "publishedAt", "username" }, row.EnumerateObject().Select(property => property.Name).Order().ToArray());
            var name = row.GetProperty("username").GetString()!;
            Assert.Equal(expected, name);
            Assert.NotNull(row.GetProperty("publishedAt").GetString());
            names.Add(name);
            cursor = page.GetProperty("nextCursor").ValueKind == JsonValueKind.Null ? null : page.GetProperty("nextCursor").GetString();
            Assert.Equal(expected == "golf-student", cursor is null);
        }
        Assert.Equal(3, names.Distinct().Count());
        var empty = await ReadJson(anonymous, "/api/platform/portfolio/public?limit=1&after=golf-student");
        Assert.Empty(empty.GetProperty("portfolios").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, empty.GetProperty("nextCursor").ValueKind);
        foreach (var username in new[] { "charlie-student", "delta-student", "echo-student", "hotel-student", "unknown-student" })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/platform/portfolio/public/{username}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/platform/portfolio/public/{username}/state")).StatusCode);
        }
        foreach (var limit in new[] { "0", "-1", "1001", "many", "1.5" })
            Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.GetAsync("/api/platform/portfolio/public?limit=" + limit)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync("/api/platform/portfolio/public?after=admin")).StatusCode);
    }

    [Fact]
    public async Task Disabling_publication_hides_state_snapshots_and_index_even_for_previously_published_records()
    {
        using var factory = new PlatformFactory(overrides: new Dictionary<string, string?> { ["Portfolio:PublishingEnabled"] = "false" });
        await Seed(factory.Services, "gated-student", true, PortfolioPublishingPolicy.Version);
        using var anonymous = factory.Browser();
        foreach (var path in new[] { "/api/platform/portfolio/public/gated-student", "/api/platform/portfolio/public/gated-student/state" })
        {
            using var response = await anonymous.GetAsync(path);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag"));
        }
        var index = await ReadJson(anonymous, "/api/platform/portfolio/public");
        Assert.Empty(index.GetProperty("portfolios").EnumerateArray());
        Assert.Equal(JsonValueKind.Null, index.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task Theme_values_are_checked_by_the_server_and_only_valid_themes_enter_a_draft()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        var userId = Guid.NewGuid();
        using var owner = factory.Browser(userId);
        var csrf = await Token(owner);
        foreach (var theme in new object[] { "custom-css", new { background = "red" }, 42 })
        {
            using var invalid = await Write(owner, userId, csrf, "draft", new
            {
                revision = (Guid?)null, searchVisible = false, data = new { name = "Riya", headline = "Student", theme }
            });
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        }
        Guid? revision = null;
        foreach (var theme in new[] { "simple", "developer" })
        {
            using var valid = await Write(owner, userId, csrf, "draft", new
            {
                revision, searchVisible = false, data = new { name = "Riya", headline = "Student", theme }
            });
            Assert.Equal(HttpStatusCode.OK, valid.StatusCode);
            var document = await valid.Content.ReadFromJsonAsync<JsonElement>(Json);
            var portfolio = document.GetProperty("portfolio");
            Assert.Equal(theme, portfolio.GetProperty("data").GetProperty("theme").GetString());
            revision = portfolio.GetProperty("revision").GetGuid();
        }
    }

    private static async Task<(Guid UserId, PortfolioRecord Record)> Seed(IServiceProvider services, string username,
        bool searchVisible, string? policyVersion = null, bool legacyPublish = false)
    {
        using var scope = services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IAccountStore>().SignIn("publication-" + username,
            username + "@example.test", "Private Google profile", default);
        var store = scope.ServiceProvider.GetRequiredService<IPortfolioStore>();
        var draft = await store.SaveDraft(user.Id, null, "{\"name\":\"Riya\",\"headline\":\"Student\",\"theme\":\"simple\"}", searchVisible, default);
        var claimed = await store.ClaimUsername(user.Id, draft.Revision, username, default);
        return (user.Id, policyVersion is not null || legacyPublish
            ? await store.Publish(user.Id, claimed.Revision, default, policyVersion) : claimed);
    }

    private static async Task<PortfolioRecord> Own(IServiceProvider services, Guid userId)
    {
        using var scope = services.CreateScope();
        return (await scope.ServiceProvider.GetRequiredService<IPortfolioStore>().GetOwner(userId, default))!;
    }

    private static async Task<string> Token(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement>("/api/platform/auth/session", Json)).GetProperty("csrfToken").GetString()!;

    private static Task<HttpResponseMessage> Write(HttpClient client, Guid userId, string csrf, string action, object body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/platform/portfolio/" + action);
        request.Headers.Add("x-account-id", userId.ToString());
        request.Headers.Add("Origin", "http://localhost:3000");
        request.Headers.Add("X-CSRF-Token", csrf);
        request.Content = JsonContent.Create(body, options: Json);
        return client.SendAsync(request);
    }

    private static async Task<JsonElement> ReadJson(HttpClient client, string path)
    {
        using var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        Assert.Contains("noindex", response.Headers.GetValues("X-Robots-Tag"));
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }
}
