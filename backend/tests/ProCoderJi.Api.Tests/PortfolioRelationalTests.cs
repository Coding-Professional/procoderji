using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Tests;

public sealed class PortfolioRelationalTests
{
    [RelationalFact]
    public async Task Database_allows_multiple_unclaimed_names_but_enforces_claimed_name_uniqueness()
    {
        using var app = new PlatformFactory();
        using var scope = app.Services.CreateScope();
        var accounts = scope.ServiceProvider.GetRequiredService<IAccountStore>();
        var portfolios = scope.ServiceProvider.GetRequiredService<IPortfolioStore>();
        var first = await accounts.SignIn("first-subject", "first@example.test", "First", default);
        var second = await accounts.SignIn("second-subject", "second@example.test", "Second", default);
        var draft = await portfolios.SaveDraft(first.Id, null, "{}", false, default);
        await portfolios.SaveDraft(second.Id, null, "{}", false, default);
        await portfolios.ClaimUsername(first.Id, draft.Revision, "student-one", default);

        await using var db = await scope.ServiceProvider.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync();
        var other = await db.Portfolios.SingleAsync(row => row.UserId == second.Id);
        other.Username = "student-one";
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [RelationalFact]
    public async Task Concurrent_claims_give_the_name_to_exactly_one_account()
    {
        using var app = new PlatformFactory();
        using var scope = app.Services.CreateScope();
        var accounts = scope.ServiceProvider.GetRequiredService<IAccountStore>();
        var portfolios = scope.ServiceProvider.GetRequiredService<IPortfolioStore>();
        var first = await accounts.SignIn("first-subject", "first@example.test", "First", default);
        var second = await accounts.SignIn("second-subject", "second@example.test", "Second", default);
        async Task<bool> Claim(Guid id)
        {
            try { await portfolios.ClaimUsername(id, null, "same-student", default); return true; }
            catch (PortfolioConflictException error) when (error.Code == "username-taken") { return false; }
        }
        var results = await Task.WhenAll(Claim(first.Id), Claim(second.Id));
        Assert.Single(results, result => result);
        Assert.Single(results, result => !result);
    }

    [RelationalFact]
    public async Task Suspension_blocks_stale_writes_and_delete_recreate_bypass()
    {
        using var app = new PlatformFactory();
        using var scope = app.Services.CreateScope();
        var accounts = scope.ServiceProvider.GetRequiredService<IAccountStore>();
        var portfolios = scope.ServiceProvider.GetRequiredService<IPortfolioStore>();
        var user = await accounts.SignIn("suspended-subject", "suspended@example.test", "Student", default);
        var portfolio = await portfolios.ClaimUsername(user.Id, null, "suspended-student", default);
        var contexts = scope.ServiceProvider.GetRequiredService<IDbContextFactory<PlatformDbContext>>();
        await using var staleWriter = await contexts.CreateDbContextAsync();
        var stale = await staleWriter.Portfolios.SingleAsync(row => row.UserId == user.Id);
        await using (var moderator = await contexts.CreateDbContextAsync())
        {
            var row = await moderator.Portfolios.SingleAsync(row => row.UserId == user.Id);
            row.Status = PortfolioStatus.Suspended;
            // Even an operator that forgets to rotate Revision cannot have this state overwritten.
            await moderator.SaveChangesAsync();
        }
        stale.Status = PortfolioStatus.Published;
        stale.PublishedJson = "{}";
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => staleWriter.SaveChangesAsync());
        var error = await Assert.ThrowsAsync<PortfolioConflictException>(() => portfolios.Delete(user.Id, portfolio.Revision, default));
        Assert.Equal("suspended", error.Code);
        Assert.Equal(PortfolioStatus.Suspended, (await portfolios.GetOwner(user.Id, default))!.Status);
    }

    [RelationalFact]
    public async Task Upgrading_an_existing_account_database_keeps_its_records()
    {
        using var app = new PlatformFactory();
        using var scope = app.Services.CreateScope();
        await using var db = await scope.ServiceProvider.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync();
        var migrator = db.GetService<IMigrator>();
        // Restore the exact pre-feature schema/history without asking EF to resolve the
        // original hand-written 12-digit ID as a generated 14-digit migration timestamp.
        // This disposable database remains scoped to this test's factory throughout.
        var migrations = db.GetService<IMigrationsAssembly>();
        var portfolioMigration = migrations.Migrations.Single(item => item.Key.EndsWith("_StudentPortfolios", StringComparison.Ordinal));
        foreach (var applied in migrations.Migrations.Keys.Where(key => string.CompareOrdinal(key, portfolioMigration.Key) >= 0).OrderDescending())
        {
            var migration = migrations.CreateMigration(migrations.Migrations[applied], db.Database.ProviderName!);
            // Drop feature tables as a whole. Reversing intermediate column changes needs
            // historical target models on SQLite, and is unnecessary for this baseline test.
            var drops = migration.DownOperations.OfType<Microsoft.EntityFrameworkCore.Migrations.Operations.DropTableOperation>()
                .Cast<Microsoft.EntityFrameworkCore.Migrations.Operations.MigrationOperation>().ToArray();
            foreach (var command in db.GetService<IMigrationsSqlGenerator>().Generate(drops))
                await db.Database.ExecuteSqlRawAsync(command.CommandText);
            await db.Database.ExecuteSqlRawAsync(db.GetService<IHistoryRepository>().GetDeleteScript(applied));
        }
        var userId = Guid.NewGuid();
        var generation = Guid.NewGuid();
        db.Users.Add(new LearnerUser { Id = userId, GoogleSubject = "existing-subject", Email = "existing@example.test", Name = "Existing", CreatedAtUtc = 1 });
        db.ProgressStates.Add(new ProgressState { UserId = userId, Generation = generation, Revision = Guid.NewGuid() });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        await migrator.MigrateAsync();
        Assert.True(await db.Users.AnyAsync(user => user.Id == userId));
        Assert.Equal(generation, (await db.ProgressStates.SingleAsync(row => row.UserId == userId)).Generation);
        Assert.Empty(await db.Portfolios.ToListAsync());
    }
}

internal sealed class RelationalFactAttribute : FactAttribute
{
    public RelationalFactAttribute()
    {
        if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("PROCODERJI_TEST_MONGODB")))
            Skip = "Relational constraint and migration checks run on SQLite, PostgreSQL and SQL Server.";
    }
}
