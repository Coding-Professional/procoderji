using MongoDB.Driver;
using ProCoderJi.Api.Data.Mongo;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Tests;

public sealed class MongoPortfolioTests
{
    private const string Original = """{"name":"Riya","headline":"Student"}""";
    private const string Edited = """{"name":"Riya","headline":"Unpublished edit"}""";

    [MongoFact]
    public async Task UniqueUsernamesAreClaimedAtomicallyAndNullNamesDoNotConflict()
    {
        await using var sandbox = await Sandbox.Open();
        var first = await sandbox.Accounts.SignIn("first", "a@example.test", "A", default);
        var second = await sandbox.Accounts.SignIn("second", "b@example.test", "B", default);
        var a = await sandbox.Portfolios.SaveDraft(first.Id, null, Original, false, default);
        var b = await sandbox.Portfolios.SaveDraft(second.Id, null, Original, false, default);

        var claims = await Task.WhenAll(
            Attempt(() => sandbox.Portfolios.ClaimUsername(first.Id, a.Revision, "shared-name", default)),
            Attempt(() => sandbox.Portfolios.ClaimUsername(second.Id, b.Revision, "shared-name", default)));
        var winner = Assert.Single(claims, result => result.Record is not null).Record!;
        Assert.Equal("username-taken", Assert.Single(claims, result => result.Error is not null).Error);
        Assert.True(await sandbox.Portfolios.IsUsernameAvailable("shared-name", winner.UserId, default));
        var loserId = winner.UserId == first.Id ? second.Id : first.Id;
        Assert.False(await sandbox.Portfolios.IsUsernameAvailable("shared-name", loserId, default));
        Assert.Equal("username-locked", (await Attempt(() => sandbox.Portfolios.ClaimUsername(
            winner.UserId, winner.Revision, "other-name", default))).Error);
        Assert.Equal("stale-revision", (await Attempt(() => sandbox.Portfolios.SaveDraft(
            winner.UserId, null, Edited, false, default))).Error);

        Assert.True(await sandbox.Portfolios.Delete(winner.UserId, winner.Revision, default));
        var loser = (await sandbox.Portfolios.GetOwner(loserId, default))!;
        var claimed = await sandbox.Portfolios.ClaimUsername(loserId, loser.Revision, "shared-name", default);
        Assert.Equal("shared-name", claimed.Username);
        Assert.Equal("account-not-found", (await Attempt(() => sandbox.Portfolios.SaveDraft(
            Guid.NewGuid(), null, Original, false, default))).Error);
    }

    [MongoFact]
    public async Task SavingAPublishedDraftDoesNotChangeItsPublicSnapshotOrSearchSetting()
    {
        await using var sandbox = await Sandbox.Open();
        var user = await sandbox.Accounts.SignIn("published", "a@example.test", "A", default);
        var draft = await sandbox.Portfolios.SaveDraft(user.Id, null, Original, false, default);
        Assert.Null(await sandbox.Portfolios.GetPublished("riya", default));
        var named = await sandbox.Portfolios.ClaimUsername(user.Id, draft.Revision, "riya", default);
        var published = await sandbox.Portfolios.Publish(user.Id, named.Revision, default);
        var saved = await sandbox.Portfolios.SaveDraft(user.Id, published.Revision, Edited, true, default);

        var visible = (await sandbox.Portfolios.GetPublished("riya", default))!;
        Assert.Equal(Original, visible.PublishedJson);
        Assert.False(visible.PublishedSearchVisible);
        Assert.Equal(Edited, saved.DraftJson);
        Assert.Equal(PortfolioStatus.Published, saved.Status);
        Assert.Equal(published.PublishedAtUtc, visible.PublishedAtUtc);

        var republished = await sandbox.Portfolios.Publish(user.Id, saved.Revision, default);
        Assert.Equal(Edited, republished.PublishedJson);
        Assert.True(republished.PublishedSearchVisible);
        var privateAgain = await sandbox.Portfolios.Unpublish(user.Id, republished.Revision, default);
        Assert.Equal(PortfolioStatus.Draft, privateAgain.Status);
        Assert.Null(privateAgain.PublishedJson);
        Assert.Null(await sandbox.Portfolios.GetPublished("riya", default));

        await sandbox.Accounts.SignIn("published", "updated@example.test", "Updated", default);
        Assert.Equal(Edited, (await sandbox.Portfolios.GetOwner(user.Id, default))!.DraftJson);
    }

    [MongoFact]
    public async Task ConcurrentSaveAndPublishCannotPublishAnUnvalidatedRevision()
    {
        await using var sandbox = await Sandbox.Open();
        var user = await sandbox.Accounts.SignIn("race", "a@example.test", "A", default);
        var draft = await sandbox.Portfolios.SaveDraft(user.Id, null, Original, false, default);
        var named = await sandbox.Portfolios.ClaimUsername(user.Id, draft.Revision, "riya", default);
        var results = await Task.WhenAll(
            Attempt(() => sandbox.Portfolios.SaveDraft(user.Id, named.Revision, Edited, true, default)),
            Attempt(() => sandbox.Portfolios.Publish(user.Id, named.Revision, default)));
        Assert.Single(results, result => result.Record is not null);
        Assert.Equal("stale-revision", Assert.Single(results, result => result.Error is not null).Error);
        var owner = (await sandbox.Portfolios.GetOwner(user.Id, default))!;
        var visible = await sandbox.Portfolios.GetPublished("riya", default);
        if (visible is not null)
        {
            Assert.Equal(Original, visible.PublishedJson);
            Assert.False(visible.PublishedSearchVisible);
        }
        else
        {
            Assert.Equal(Edited, owner.DraftJson);
            Assert.Equal(PortfolioStatus.Draft, owner.Status);
        }
    }

    [MongoFact]
    public async Task SuspensionCannotBeBypassedAndAccountDeletionRemovesTheEmbeddedPortfolio()
    {
        await using var sandbox = await Sandbox.Open();
        var user = await sandbox.Accounts.SignIn("suspended", "a@example.test", "A", default);
        var named = await sandbox.Portfolios.ClaimUsername(user.Id, null, "riya", default);
        var saved = await sandbox.Portfolios.SaveDraft(user.Id, named.Revision, Original, false, default);
        var published = await sandbox.Portfolios.Publish(user.Id, saved.Revision, default);
        await sandbox.Database.Users.UpdateOneAsync(row => row.Id == user.Id.ToString("D"),
            Builders<MongoUserDocument>.Update.Set(row => row.Portfolio!.Status, PortfolioStatus.Suspended));
        Assert.Null(await sandbox.Portfolios.GetPublished("riya", default));
        Assert.Equal("suspended", (await Attempt(() => sandbox.Portfolios.Publish(user.Id, published.Revision, default))).Error);
        var edited = await sandbox.Portfolios.SaveDraft(user.Id, published.Revision, Edited, true, default);
        var unpublished = await sandbox.Portfolios.Unpublish(user.Id, edited.Revision, default);
        Assert.Equal(PortfolioStatus.Suspended, unpublished.Status);
        Assert.Equal("suspended", (await Attempt(() => sandbox.Portfolios.Publish(user.Id, unpublished.Revision, default))).Error);
        var deletion = await Assert.ThrowsAsync<PortfolioConflictException>(() => sandbox.Portfolios.Delete(user.Id, unpublished.Revision, default));
        Assert.Equal("suspended", deletion.Code);
        Assert.Equal(PortfolioStatus.Suspended, (await sandbox.Portfolios.GetOwner(user.Id, default))!.Status);

        await Task.WhenAll(
            sandbox.Database.Users.DeleteOneAsync(row => row.Id == user.Id.ToString("D")),
            Attempt(() => sandbox.Portfolios.SaveDraft(user.Id, unpublished.Revision, Original, false, default)));
        Assert.Null(await sandbox.Portfolios.GetOwner(user.Id, default));
        Assert.Null(await sandbox.Portfolios.GetPublished("riya", default));
        Assert.True(await sandbox.Portfolios.IsUsernameAvailable("riya", Guid.NewGuid(), default));
    }

    private static async Task<(PortfolioRecord? Record, string? Error)> Attempt(Func<Task<PortfolioRecord>> action)
    {
        try { return (await action(), null); }
        catch (PortfolioConflictException error) { return (null, error.Code); }
    }

    private sealed class Sandbox : IAsyncDisposable
    {
        private readonly MongoClient client = new(Environment.GetEnvironmentVariable("PROCODERJI_TEST_MONGODB")!);
        private readonly string name = "procoderji_portfolio_" + Guid.NewGuid().ToString("N");
        public MongoPlatformDatabase Database { get; }
        public MongoAccountStore Accounts { get; }
        public MongoPortfolioStore Portfolios { get; }

        private Sandbox()
        {
            Database = new MongoPlatformDatabase(client.GetDatabase(name));
            Accounts = new MongoAccountStore(Database);
            Portfolios = new MongoPortfolioStore(Database);
        }

        public static async Task<Sandbox> Open()
        {
            var sandbox = new Sandbox();
            await sandbox.Database.InitializeAsync();
            return sandbox;
        }

        public async ValueTask DisposeAsync()
        {
            try { await client.DropDatabaseAsync(name); }
            finally { client.Dispose(); }
        }
    }
}
