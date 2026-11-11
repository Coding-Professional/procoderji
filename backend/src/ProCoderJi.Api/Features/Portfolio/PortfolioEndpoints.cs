using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.RateLimiting;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Infrastructure;

namespace ProCoderJi.Api.Features.Portfolio;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SavePortfolioDraftRequest(
    [property: JsonRequired] JsonNode? Data,
    [property: JsonRequired] bool SearchVisible,
    [property: JsonRequired] Guid? Revision);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ClaimPortfolioUsernameRequest(
    [property: JsonRequired] string? Username,
    [property: JsonRequired] Guid? Revision);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PortfolioRevisionRequest([property: JsonRequired] Guid Revision);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PortfolioEligibility(
    [property: JsonRequired] bool AtLeast18,
    [property: JsonRequired] string PolicyVersion);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PublishPortfolioRequest(
    [property: JsonRequired] Guid Revision,
    [property: JsonRequired] PortfolioEligibility? Eligibility);

public static class PortfolioEndpoints
{
    private const int MaxBytes = 256 * 1024;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    public static void MapPortfolioEndpoints(this WebApplication app)
    {
        app.MapGet("/api/platform/portfolio", GetOwner);
        app.MapGet("/api/platform/portfolio/username", CheckUsername)
            .RequireRateLimiting(PortfolioApiConfiguration.UsernamePolicy);
        app.MapGet("/api/platform/portfolio/public/{username}", GetPublic);
        app.MapGet("/api/platform/portfolio/public/{username}/state", GetPublicState);
        app.MapGet("/api/platform/portfolio/public", GetPublicIndex);
        app.MapPost("/api/platform/portfolio/draft", SaveDraft)
            .RequireRateLimiting(PortfolioApiConfiguration.WritePolicy);
        app.MapPost("/api/platform/portfolio/username", ClaimUsername)
            .RequireRateLimiting(PortfolioApiConfiguration.WritePolicy);
        app.MapPost("/api/platform/portfolio/publish", Publish)
            .RequireRateLimiting(PortfolioApiConfiguration.WritePolicy);
        app.MapPost("/api/platform/portfolio/unpublish", Unpublish)
            .RequireRateLimiting(PortfolioApiConfiguration.WritePolicy);
        app.MapDelete("/api/platform/portfolio", Delete)
            .RequireRateLimiting(PortfolioApiConfiguration.WritePolicy);
    }

    private static async Task<IResult> GetOwner(HttpContext context, IPortfolioStore store, IConfiguration configuration)
    {
        var error = CheckOwner(context, out var userId);
        if (error is not null) return error;
        var portfolio = await store.GetOwner(userId, context.RequestAborted);
        return Results.Json(new { portfolio = portfolio is null ? null : Owner(portfolio), publishingEnabled = PublishingEnabled(configuration),
            policyVersion = PortfolioPublishingPolicy.Version, minimumPublishingAge = PortfolioPublishingPolicy.MinimumAge });
    }

    private static async Task<IResult> CheckUsername(HttpContext context, string? username, IPortfolioStore store, PortfolioValidator validator)
    {
        var error = CheckOwner(context, out var userId);
        if (error is not null) return error;
        var problems = validator.ValidateUsername(JsonValue.Create(username));
        if (problems.Count != 0) return Invalid(problems);
        return Results.Json(new { username, available = await store.IsUsernameAvailable(username!, userId, context.RequestAborted) });
    }

    private static async Task<IResult> GetPublic(string username, HttpContext context, IPortfolioStore store, PortfolioValidator validator, IConfiguration configuration)
    {
        context.Response.Headers["X-Robots-Tag"] = "noindex";
        if (!PublishingEnabled(configuration) || validator.ValidateUsername(username).Count != 0)
            return Results.NotFound();
        var portfolio = await store.GetPublished(username, context.RequestAborted);
        if (portfolio is null || portfolio.Status != PortfolioStatus.Published || portfolio.PublishedJson is null || !PortfolioPublishingPolicy.IsAccepted(portfolio))
            return Results.NotFound();
        var version = PortfolioPublishingPolicy.PublicVersion(portfolio);
        var expected = context.Request.Query["version"].ToString();
        if (expected.Length != 0 && expected != version) return Results.NotFound();
        // This whitelist intentionally excludes drafts, internal identity, revision, and
        // the account's Google profile. Search visibility comes from the published version.
        return Results.Json(new
        {
            username = portfolio.Username,
            data = JsonNode.Parse(portfolio.PublishedJson),
            searchVisible = portfolio.PublishedSearchVisible,
            publishedAt = Timestamp(portfolio.PublishedAtUtc), version
        });
    }

    private static async Task<IResult> GetPublicState(string username, HttpContext context, IPortfolioStore store, PortfolioValidator validator, IConfiguration configuration)
    {
        context.Response.Headers["X-Robots-Tag"] = "noindex";
        if (!PublishingEnabled(configuration) || validator.ValidateUsername(username).Count != 0) return Results.NotFound();
        var portfolio = await store.GetPublished(username, context.RequestAborted);
        if (portfolio is null || !PortfolioPublishingPolicy.IsAccepted(portfolio)) return Results.NotFound();
        return Results.Json(new { username, version = PortfolioPublishingPolicy.PublicVersion(portfolio),
            searchVisible = portfolio.PublishedSearchVisible, publishedAt = Timestamp(portfolio.PublishedAtUtc) });
    }

    private static async Task<IResult> GetPublicIndex(HttpContext context, IPortfolioStore store, PortfolioValidator validator, IConfiguration configuration)
    {
        context.Response.Headers["X-Robots-Tag"] = "noindex";
        if (!PublishingEnabled(configuration)) return Results.Json(new { portfolios = Array.Empty<object>(), nextCursor = (string?)null });
        var after = context.Request.Query["after"].ToString();
        if (after.Length > 0 && validator.ValidateUsername(after).Count != 0) return Results.NotFound();
        var limitText = context.Request.Query["limit"].ToString();
        var limit = 1000;
        if (limitText.Length > 0 && (!int.TryParse(limitText, NumberStyles.None, CultureInfo.InvariantCulture, out limit) || limit is < 1 or > 1000))
            return Error("invalid-limit", "Use an index page size between 1 and 1000.", 400);
        var records = await store.ListSearchVisible(after.Length == 0 ? null : after, limit + 1, context.RequestAborted);
        var page = records.Take(limit).ToArray();
        return Results.Json(new { portfolios = page.Select(row => new { username = row.Username, publishedAt = Timestamp(row.PublishedAtUtc) }),
            nextCursor = records.Count > limit ? page[^1].Username : null });
    }

    private static async Task<IResult> SaveDraft(HttpContext context, IPortfolioStore store, PortfolioValidator validator, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = await CheckWrite(context, configuration, antiforgery);
        if (error is not null) return error;
        var read = await Read<SavePortfolioDraftRequest>(context);
        if (read.Error is not null) return read.Error;
        var body = read.Body!;
        if (body.Revision == Guid.Empty) return InvalidRevision();
        var problems = validator.Validate(body.Data, PortfolioMode.Draft);
        if (problems.Count != 0) return Invalid(problems);
        return await Mutation(context, () => store.SaveDraft(ApiSecurity.UserId(context)!.Value, body.Revision,
            body.Data!.ToJsonString(Json), body.SearchVisible, context.RequestAborted));
    }

    private static async Task<IResult> ClaimUsername(HttpContext context, IPortfolioStore store, PortfolioValidator validator, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = await CheckWrite(context, configuration, antiforgery);
        if (error is not null) return error;
        var read = await Read<ClaimPortfolioUsernameRequest>(context);
        if (read.Error is not null) return read.Error;
        if (read.Body!.Revision == Guid.Empty) return InvalidRevision();
        var problems = validator.ValidateUsername(JsonValue.Create(read.Body.Username));
        if (problems.Count != 0) return Invalid(problems);
        return await Mutation(context, () => store.ClaimUsername(ApiSecurity.UserId(context)!.Value,
            read.Body.Revision, read.Body.Username!, context.RequestAborted));
    }

    private static async Task<IResult> Publish(HttpContext context, IPortfolioStore store, PortfolioValidator validator, IConfiguration settings, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = await CheckWrite(context, configuration, antiforgery);
        if (error is not null) return error;
        var read = await Read<PublishPortfolioRequest>(context);
        if (read.Error is not null) return read.Error;
        if (read.Body!.Revision == Guid.Empty) return InvalidRevision();
        if (!PublishingEnabled(settings))
            return Error("publishing-disabled", "Public portfolio publishing is not enabled yet.", 503);
        if (read.Body.Eligibility is not { AtLeast18: true })
            return Error("publishing-eligibility-required", "Confirm that you are at least 18 and have read the portfolio Terms and Privacy Policy.", 400);
        if (read.Body.Eligibility.PolicyVersion != PortfolioPublishingPolicy.Version)
            return Error("policy-changed", "The portfolio publishing policy changed. Refresh and review it before publishing.", 409);
        var userId = ApiSecurity.UserId(context)!.Value;
        var portfolio = await store.GetOwner(userId, context.RequestAborted);
        if (portfolio is null) return Conflict("not-found");
        if (portfolio.Revision != read.Body.Revision) return Conflict("stale-revision");
        if (portfolio.Status == PortfolioStatus.Suspended) return Conflict("suspended");
        var problems = validator.Validate(JsonNode.Parse(portfolio.DraftJson), PortfolioMode.Publish);
        if (problems.Count != 0) return Invalid(problems);
        return await Mutation(context, () => store.Publish(userId, read.Body.Revision, context.RequestAborted, PortfolioPublishingPolicy.Version));
    }

    private static async Task<IResult> Unpublish(HttpContext context, IPortfolioStore store, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = await CheckWrite(context, configuration, antiforgery);
        if (error is not null) return error;
        var read = await Read<PortfolioRevisionRequest>(context);
        if (read.Error is not null) return read.Error;
        if (read.Body!.Revision == Guid.Empty) return InvalidRevision();
        return await Mutation(context, () => store.Unpublish(ApiSecurity.UserId(context)!.Value, read.Body.Revision, context.RequestAborted));
    }

    private static async Task<IResult> Delete(HttpContext context, IPortfolioStore store, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = await CheckWrite(context, configuration, antiforgery);
        if (error is not null) return error;
        var read = await Read<PortfolioRevisionRequest>(context);
        if (read.Error is not null) return read.Error;
        if (read.Body!.Revision == Guid.Empty) return InvalidRevision();
        try
        {
            var userId = ApiSecurity.UserId(context)!.Value;
            var portfolio = await store.GetOwner(userId, context.RequestAborted);
            await store.Delete(userId, read.Body.Revision, context.RequestAborted);
            if (portfolio?.Username is { } username) context.Response.Headers["X-Portfolio-Username"] = username;
            return Results.NoContent();
        }
        catch (PortfolioConflictException cause) { return Conflict(cause.Code); }
    }

    private static object Owner(PortfolioRecord record) => new
    {
        username = record.Username,
        data = JsonNode.Parse(record.DraftJson),
        searchVisible = record.SearchVisible,
        status = record.Status.ToString().ToLowerInvariant(),
        revision = record.Revision,
        createdAt = Timestamp(record.CreatedAtUtc),
        updatedAt = Timestamp(record.UpdatedAtUtc),
        publishedAt = Timestamp(record.PublishedAtUtc),
        publishingPolicyVersion = record.PublishingPolicyVersion,
        eligibilityConfirmedAt = Timestamp(record.EligibilityConfirmedAtUtc)
    };

    private static string? Timestamp(long? milliseconds) => milliseconds is null ? null
        : DateTimeOffset.FromUnixTimeMilliseconds(milliseconds.Value).ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture);

    private static bool PublishingEnabled(IConfiguration configuration) => configuration.GetValue<bool>("Portfolio:PublishingEnabled");

    private static IResult? CheckOwner(HttpContext context, out Guid userId)
    {
        var id = ApiSecurity.UserId(context);
        userId = id ?? Guid.Empty;
        return id is null ? Error("sign-in-required", "Sign in to manage your portfolio.", 401)
            : ApiSecurity.CheckAccount(context, userId);
    }

    private static async Task<IResult?> CheckWrite(HttpContext context, PlatformConfiguration configuration, IAntiforgery antiforgery)
    {
        var error = CheckOwner(context, out _);
        return error ?? await ApiSecurity.CheckWrite(context, configuration, antiforgery);
    }

    private static IResult Invalid(IReadOnlyList<PortfolioProblem> problems) => Results.Json(new
    {
        code = "validation-failed", error = "Correct the portfolio fields before saving.", problems
    }, statusCode: 400);

    private static IResult InvalidRevision() => Error("invalid-revision", "Send the current portfolio revision, or null when creating a draft.", 400);

    private static IResult Error(string code, string message, int status) => Results.Json(new { code, error = message }, statusCode: status);

    private static IResult Conflict(string code) => code switch
    {
        "not-found" => Error(code, "Portfolio not found.", 404),
        "account-not-found" => Error(code, "Sign in to manage your portfolio.", 401),
        "username-required" => Error(code, "Claim a username before publishing.", 400),
        "suspended" => Error(code, "This portfolio is suspended. Contact support before publishing.", 403),
        "username-taken" => Error(code, "That username is already claimed.", 409),
        "username-locked" => Error(code, "A claimed username cannot be changed.", 409),
        _ => Error("stale-revision", "Your portfolio changed. Refresh before trying again.", 409)
    };

    private static async Task<IResult> Mutation(HttpContext context, Func<Task<PortfolioRecord>> action)
    {
        try
        {
            var portfolio = await action();
            if (portfolio.Username is { } username) context.Response.Headers["X-Portfolio-Username"] = username;
            return Results.Json(new { portfolio = Owner(portfolio) });
        }
        catch (PortfolioConflictException cause) { return Conflict(cause.Code); }
    }

    private static async Task<(T? Body, IResult? Error)> Read<T>(HttpContext context) where T : class
    {
        if (!context.Request.HasJsonContentType()) return (null, Error("json-required", "Send a JSON portfolio request.", 415));
        if (context.Request.ContentLength > MaxBytes) return (null, Error("payload-too-large", "The portfolio request is too large.", 413));
        try
        {
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int count;
            while ((count = await context.Request.Body.ReadAsync(chunk, context.RequestAborted)) > 0)
            {
                if (buffer.Length + count > MaxBytes) return (null, Error("payload-too-large", "The portfolio request is too large.", 413));
                await buffer.WriteAsync(chunk.AsMemory(0, count), context.RequestAborted);
            }
            var body = JsonSerializer.Deserialize<T>(buffer.ToArray(), Json);
            return body is null ? (null, Error("invalid-payload", "Send a valid portfolio request.", 400)) : (body, null);
        }
        catch (JsonException) { return (null, Error("invalid-payload", "Send a valid portfolio request and revision.", 400)); }
        catch (BadHttpRequestException cause) when (cause.StatusCode == 413)
        {
            return (null, Error("payload-too-large", "The portfolio request is too large.", 413));
        }
    }
}
