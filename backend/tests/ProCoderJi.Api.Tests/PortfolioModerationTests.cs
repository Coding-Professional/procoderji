using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Tests;

public sealed class PortfolioModerationTests
{
    private static readonly IReadOnlyDictionary<string, string?> Publishing = new Dictionary<string, string?>
    {
        ["Portfolio:PublishingEnabled"] = "true"
    };

    [Fact]
    public async Task Command_validation_and_help_never_start_a_database_or_print_arguments()
    {
        await using var services = new ServiceCollection().BuildServiceProvider();
        Assert.Null(await PortfolioModerationCommand.TryRun([], services));
        Assert.True(PortfolioModerationCommand.IsRequested(["--portfolio=suspend"]));
        foreach (var args in new[]
        {
            new[] { "--portfolio" },
            new[] { "--portfolio", "token=private-value", "--username", "student-one" },
            new[] { "--portfolio", "suspend", "--username", "../secret" },
            new[] { "--portfolio", "suspend", "--username", "Student" },
            new[] { "--portfolio", "suspend", "--username", "student-one", "--other", "private-value" },
        })
        {
            using var output = new StringWriter();
            using var error = new StringWriter();
            Assert.Equal(2, await PortfolioModerationCommand.TryRun(args, services, output: output, error: error));
            Assert.Equal("", output.ToString());
            Assert.DoesNotContain("private-value", error.ToString());
        }
        using var help = new StringWriter();
        Assert.Equal(0, await PortfolioModerationCommand.TryRun(["--portfolio", "help"], services, output: help));
        Assert.Contains("suspend|restore", help.ToString());
    }

    [Fact]
    public async Task Suspension_and_restore_rotate_revisions_hide_the_page_and_require_fresh_publication()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var store = services.GetRequiredService<IPortfolioStore>();
        var user = await services.GetRequiredService<IAccountStore>().SignIn("moderated-subject", "moderated@example.test", "Student", default);
        var draft = await store.SaveDraft(user.Id, null, "{\"name\":\"Riya\",\"headline\":\"Student\"}", true, default);
        var claim = await store.ClaimUsername(user.Id, draft.Revision, "moderated-student", default);
        var published = await store.Publish(user.Id, claim.Revision, default, PortfolioPublishingPolicy.Version);
        using var browser = factory.Browser();
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/platform/portfolio/public/moderated-student")).StatusCode);

        var suspended = await Moderate(factory.Services, "suspend", "moderated-student");
        Assert.Equal("suspended", suspended.Status);
        Assert.NotEqual(published.Revision, suspended.Revision);
        var hidden = await store.GetOwner(user.Id, default);
        Assert.Equal(PortfolioStatus.Suspended, hidden!.Status);
        Assert.Null(hidden.PublishedJson);
        Assert.False(hidden.PublishedSearchVisible);
        Assert.Null(hidden.PublishingPolicyVersion);
        Assert.Equal(HttpStatusCode.NotFound, (await browser.GetAsync("/api/platform/portfolio/public/moderated-student")).StatusCode);
        Assert.Equal(suspended.Revision, (await Moderate(factory.Services, "suspend", "moderated-student")).Revision);
        Assert.Equal("suspended", (await Assert.ThrowsAsync<PortfolioConflictException>(() => store.Delete(user.Id, hidden.Revision, default))).Code);
        Assert.Equal("stale-revision", (await Assert.ThrowsAsync<PortfolioConflictException>(() =>
            store.SaveDraft(user.Id, published.Revision, "{}", false, default))).Code);

        var restored = await Moderate(factory.Services, "restore", "moderated-student");
        Assert.Equal("draft", restored.Status);
        Assert.NotEqual(suspended.Revision, restored.Revision);
        var owner = (await store.GetOwner(user.Id, default))!;
        Assert.Equal(published.DraftJson, owner.DraftJson);
        Assert.True(owner.SearchVisible);
        Assert.Null(owner.PublishedJson);
        Assert.Null(owner.EligibilityConfirmedAtUtc);
        Assert.Equal(HttpStatusCode.NotFound, (await browser.GetAsync("/api/platform/portfolio/public/moderated-student")).StatusCode);
        Assert.Equal(restored.Revision, (await Moderate(factory.Services, "restore", "moderated-student")).Revision);
        var republished = await store.Publish(user.Id, owner.Revision, default, PortfolioPublishingPolicy.Version);
        Assert.Equal(PortfolioStatus.Published, republished.Status);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/platform/portfolio/public/moderated-student")).StatusCode);
    }

    [Fact]
    public async Task Concurrent_student_publish_cannot_undo_an_operator_suspension()
    {
        using var factory = new PlatformFactory(overrides: Publishing);
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var store = services.GetRequiredService<IPortfolioStore>();
        var user = await services.GetRequiredService<IAccountStore>().SignIn("racing-subject", "race@example.test", "Student", default);
        var draft = await store.SaveDraft(user.Id, null, "{\"name\":\"Riya\",\"headline\":\"Student\"}", false, default);
        var claimed = await store.ClaimUsername(user.Id, draft.Revision, "racing-student", default);
        async Task Publish()
        {
            try { await store.Publish(user.Id, claimed.Revision, default, PortfolioPublishingPolicy.Version); }
            catch (PortfolioConflictException error) when (error.Code is "stale-revision" or "suspended") { }
        }
        await Task.WhenAll(Publish(), Moderate(factory.Services, "suspend", "racing-student"));
        var final = (await store.GetOwner(user.Id, default))!;
        Assert.Equal(PortfolioStatus.Suspended, final.Status);
        Assert.Null(final.PublishedJson);
        Assert.Null(await store.GetPublished("racing-student", default));
    }

    [Fact]
    public async Task Unknown_usernames_return_a_nonzero_exit_code_without_printing_student_data()
    {
        using var factory = new PlatformFactory();
        using var output = new StringWriter();
        using var error = new StringWriter();
        Assert.Equal(3, await PortfolioModerationCommand.TryRun(
            ["--portfolio", "suspend", "--username", "missing-student"], factory.Services, output: output, error: error));
        Assert.Equal("", output.ToString());
        Assert.Contains("not found", error.ToString());
    }

    private static async Task<PortfolioModerationResult> Moderate(IServiceProvider services, string action, string username)
    {
        using var output = new StringWriter();
        using var error = new StringWriter();
        var code = await PortfolioModerationCommand.TryRun(["--portfolio", action, "--username", username], services,
            output: output, error: error);
        Assert.True(code == 0, $"Moderation exited {code}: {error}");
        var result = JsonSerializer.Deserialize<PortfolioModerationResult>(output.ToString(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return Assert.IsType<PortfolioModerationResult>(result);
    }
}
