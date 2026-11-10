using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using ProCoderJi.Api.Data.Mongo;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Features.Progress;

namespace ProCoderJi.Api.Tests;

/// <summary>Runs against a disposable Mongo server; each test owns and drops only its random database.</summary>
public sealed class MongoPersistenceTests
{
    [MongoFact]
    public async Task GoogleSubjectsAreUniqueAndEmailDoesNotChooseTheAccount()
    {
        await using var sandbox = await Sandbox.Open();
        var users = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            sandbox.Accounts.SignIn("google-subject", "student@example.test", "Student", CancellationToken.None)));
        Assert.Single(users.Select(user => user.Id).Distinct());
        var changed = await sandbox.Accounts.SignIn("google-subject", "new@example.test", new string('n', 250), CancellationToken.None);
        Assert.Equal(users[0].Id, changed.Id);
        Assert.Equal("new@example.test", changed.Email);
        Assert.Equal(200, changed.Name.Length);
        var other = await sandbox.Accounts.SignIn("different-subject", "new@example.test", "Other", CancellationToken.None);
        Assert.NotEqual(changed.Id, other.Id);
        Assert.True(await sandbox.Accounts.Exists(changed.Id, CancellationToken.None));
        Assert.False(await sandbox.Accounts.Exists(Guid.NewGuid(), CancellationToken.None));
    }

    [MongoFact]
    public async Task AttemptsStayImmutableIsolatedAndBoundedAcrossStoreRecreation()
    {
        await using var sandbox = await Sandbox.Open();
        var user = await sandbox.Accounts.SignIn("subject-a", "a@example.test", "A", CancellationToken.None);
        var other = await sandbox.Accounts.SignIn("subject-b", "b@example.test", "B", CancellationToken.None);
        var state = await sandbox.Progress.Read(user.Id, CancellationToken.None);
        var original = Attempt(0);
        await sandbox.Progress.Sync(user.Id, state.Generation, [original], CancellationToken.None);
        var modified = original with { DurationSeconds = 999, Responses = [new("q1", "different")] };
        var repeated = await sandbox.Progress.Sync(user.Id, state.Generation, [modified], CancellationToken.None);
        Assert.Equal(original.DurationSeconds, Assert.Single(repeated.Attempts).DurationSeconds);
        Assert.Equal(original.Responses[0].OptionId, repeated.Attempts[0].Responses![0].OptionId);
        Assert.Empty((await sandbox.Progress.Read(other.Id, CancellationToken.None)).Attempts);

        await sandbox.Progress.Sync(user.Id, state.Generation, Enumerable.Range(1, 60).Select(Attempt).ToArray(), CancellationToken.None);
        await sandbox.Progress.Sync(user.Id, state.Generation, Enumerable.Range(61, 60).Select(Attempt).ToArray(), CancellationToken.None);
        var recreated = new MongoProgressStore(sandbox.Database, new MongoAccountStore(sandbox.Database));
        var persisted = await recreated.Read(user.Id, CancellationToken.None);
        Assert.Equal(100, persisted.Attempts.Count);
        Assert.DoesNotContain(persisted.Attempts, attempt => attempt.Id == original.Id);
        Assert.Equal(state.Generation, persisted.Generation);
    }

    [MongoFact]
    public async Task ConcurrentSyncsDoNotLoseAttemptsAndResetRejectsStaleGenerations()
    {
        await using var sandbox = await Sandbox.Open();
        var user = await sandbox.Accounts.SignIn("concurrent", "c@example.test", "Concurrent", CancellationToken.None);
        var state = await sandbox.Progress.Read(user.Id, CancellationToken.None);
        await Task.WhenAll(Enumerable.Range(0, 8).Select(index => sandbox.Progress.Sync(
            user.Id, state.Generation, [Attempt(index)], CancellationToken.None)));
        Assert.Equal(8, (await sandbox.Progress.Read(user.Id, CancellationToken.None)).Attempts.Count);

        var reset = await sandbox.Progress.Reset(user.Id, CancellationToken.None);
        Assert.NotEqual(state.Generation, reset);
        await Assert.ThrowsAsync<ProgressGenerationConflictException>(() => sandbox.Progress.Sync(
            user.Id, state.Generation, [Attempt(100)], CancellationToken.None));
        var after = await sandbox.Progress.Read(user.Id, CancellationToken.None);
        Assert.Empty(after.Attempts);
        Assert.Equal(reset, after.Generation);
        await sandbox.Progress.Sync(user.Id, reset, [Attempt(101)], CancellationToken.None);
        Assert.Single((await sandbox.Progress.Read(user.Id, CancellationToken.None)).Attempts);
    }

    [MongoFact]
    public async Task DataProtectionKeysAreSharedByFreshServiceProviders()
    {
        await using var sandbox = await Sandbox.Open();
        using var first = ProtectionServices(sandbox.Database);
        var protectedText = first.GetRequiredService<IDataProtectionProvider>().CreateProtector("integration-test").Protect("private student session");
        using var second = ProtectionServices(sandbox.Database);
        Assert.Equal("private student session", second.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("integration-test").Unprotect(protectedText));

        var repository = new MongoXmlRepository(sandbox.Database);
        repository.StoreElement(new XElement("test", new XAttribute("id", "separate")), "test-entry");
        Assert.Contains(new MongoXmlRepository(sandbox.Database).GetAllElements(), element => element.Name == "test");
    }

    private static ServiceProvider ProtectionServices(MongoPlatformDatabase database)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDataProtection().SetApplicationName("ProCoderJi.MongoIntegrationTests");
        services.Configure<KeyManagementOptions>(options => options.XmlRepository = new MongoXmlRepository(database));
        return services.BuildServiceProvider();
    }

    private static ValidatedAttempt Attempt(int index) => new(Guid.NewGuid(), DateTimeOffset.UtcNow.AddSeconds(index),
        "quantitative", ["q1"], [new("q1", "a")], 10);

    private sealed class Sandbox : IAsyncDisposable
    {
        private readonly IMongoClient client;
        private readonly string name = "procoderji_mongo_" + Guid.NewGuid().ToString("N");
        public MongoPlatformDatabase Database { get; }
        public MongoAccountStore Accounts { get; }
        public MongoProgressStore Progress { get; }

        private Sandbox()
        {
            client = new MongoClient(Environment.GetEnvironmentVariable("PROCODERJI_TEST_MONGODB")!);
            Database = new MongoPlatformDatabase(client.GetDatabase(name));
            Accounts = new MongoAccountStore(Database);
            Progress = new MongoProgressStore(Database, Accounts);
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
            finally { (client as IDisposable)?.Dispose(); }
        }
    }
}

internal sealed class MongoFactAttribute : FactAttribute
{
    public MongoFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PROCODERJI_TEST_MONGODB")))
            Skip = "Set PROCODERJI_TEST_MONGODB to a disposable MongoDB server to run persistence integration checks.";
    }
}
