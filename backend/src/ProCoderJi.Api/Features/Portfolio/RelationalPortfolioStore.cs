using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Features.Portfolio;

/// <summary>Relational portfolio writes are owner-scoped, revision-checked transactions.</summary>
public sealed class RelationalPortfolioStore(IDbContextFactory<PlatformDbContext> factory) : IPortfolioStore
{
    public async Task<PortfolioRecord?> GetOwner(Guid userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Portfolios.AsNoTracking().SingleOrDefaultAsync(row => row.UserId == userId, cancellationToken);
        return row is null ? null : Record(row);
    }

    public async Task<PortfolioRecord?> GetPublished(string username, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Portfolios.AsNoTracking().SingleOrDefaultAsync(row => row.Username == username
            && row.Status == PortfolioStatus.Published && row.PublishedJson != null, cancellationToken);
        return row is null ? null : Record(row);
    }

    public async Task<bool> IsUsernameAvailable(string username, Guid userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return !await db.Portfolios.AnyAsync(row => row.Username == username && row.UserId != userId, cancellationToken);
    }

    public Task<PortfolioRecord> SaveDraft(Guid userId, Guid? revision, string dataJson, bool searchVisible, CancellationToken cancellationToken) =>
        InTransaction(async db =>
        {
            var row = await Editable(db, userId, revision, create: true, cancellationToken);
            row.DraftJson = dataJson;
            row.SearchVisible = searchVisible;
            Touch(row);
            await db.SaveChangesAsync(cancellationToken);
            return Record(row);
        }, cancellationToken);

    public Task<PortfolioRecord> ClaimUsername(Guid userId, Guid? revision, string username, CancellationToken cancellationToken) =>
        InTransaction(async db =>
        {
            var row = await Editable(db, userId, revision, create: true, cancellationToken);
            if (row.Username is not null && row.Username != username) throw new PortfolioConflictException("username-locked");
            if (await db.Portfolios.AnyAsync(other => other.Username == username && other.UserId != userId, cancellationToken))
                throw new PortfolioConflictException("username-taken");
            if (row.Username == username) return Record(row);
            row.Username = username;
            Touch(row);
            await db.SaveChangesAsync(cancellationToken);
            return Record(row);
        }, cancellationToken);

    public Task<PortfolioRecord> Publish(Guid userId, Guid revision, CancellationToken cancellationToken, string? policyVersion = null) =>
        InTransaction(async db =>
        {
            var row = await Editable(db, userId, revision, create: false, cancellationToken);
            if (row.Status == PortfolioStatus.Suspended) throw new PortfolioConflictException("suspended");
            if (row.Username is null) throw new PortfolioConflictException("username-required");
            row.PublishedJson = row.DraftJson;
            row.PublishedSearchVisible = row.SearchVisible;
            row.Status = PortfolioStatus.Published;
            row.PublishedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            row.PublishingPolicyVersion = policyVersion;
            row.EligibilityConfirmedAtUtc = policyVersion is null ? null : row.PublishedAtUtc;
            Touch(row);
            await db.SaveChangesAsync(cancellationToken);
            return Record(row);
        }, cancellationToken);

    public Task<PortfolioRecord> Unpublish(Guid userId, Guid revision, CancellationToken cancellationToken) =>
        InTransaction(async db =>
        {
            var row = await Editable(db, userId, revision, create: false, cancellationToken);
            row.PublishedJson = null;
            row.PublishedSearchVisible = false;
            if (row.Status != PortfolioStatus.Suspended) row.Status = PortfolioStatus.Draft;
            Touch(row);
            await db.SaveChangesAsync(cancellationToken);
            return Record(row);
        }, cancellationToken);

    public Task<bool> Delete(Guid userId, Guid revision, CancellationToken cancellationToken) =>
        InTransaction(async db =>
        {
            var row = await db.Portfolios.SingleOrDefaultAsync(row => row.UserId == userId, cancellationToken);
            if (row is null) return false;
            if (row.Revision != revision) throw new PortfolioConflictException("stale-revision");
            if (row.Status == PortfolioStatus.Suspended) throw new PortfolioConflictException("suspended");
            db.Portfolios.Remove(row);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        }, cancellationToken);

    private static async Task<PortfolioEntity> Editable(PlatformDbContext db, Guid userId, Guid? revision, bool create, CancellationToken cancellationToken)
    {
        var row = await db.Portfolios.SingleOrDefaultAsync(row => row.UserId == userId, cancellationToken);
        if (row is not null)
        {
            if (revision is null || row.Revision != revision) throw new PortfolioConflictException("stale-revision");
            return row;
        }
        if (!create) throw new PortfolioConflictException("not-found");
        if (revision is not null) throw new PortfolioConflictException("stale-revision");
        if (!await db.Users.AnyAsync(user => user.Id == userId, cancellationToken)) throw new PortfolioConflictException("account-not-found");
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        row = new PortfolioEntity { UserId = userId, DraftJson = "{}", Status = PortfolioStatus.Draft,
            Revision = Guid.NewGuid(), CreatedAtUtc = now, UpdatedAtUtc = now };
        db.Portfolios.Add(row);
        return row;
    }

    private static void Touch(PortfolioEntity row)
    {
        row.Revision = Guid.NewGuid();
        row.UpdatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    private static PortfolioRecord Record(PortfolioEntity row) => new(row.UserId, row.Username, row.DraftJson, row.PublishedJson,
        row.SearchVisible, row.PublishedSearchVisible, row.Status, row.Revision, row.CreatedAtUtc, row.UpdatedAtUtc, row.PublishedAtUtc,
        row.PublishingPolicyVersion, row.EligibilityConfirmedAtUtc);

    public async Task<IReadOnlyList<PortfolioIndexEntry>> ListSearchVisible(string? after, int limit, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.Portfolios.AsNoTracking().Where(row => row.Status == PortfolioStatus.Published
            && row.PublishedJson != null && row.Username != null && row.PublishedSearchVisible
            && row.PublishingPolicyVersion == PortfolioPublishingPolicy.Version && row.EligibilityConfirmedAtUtc != null && row.PublishedAtUtc != null
            && (after == null || string.Compare(row.Username, after) > 0))
            .OrderBy(row => row.Username).Take(limit)
            .Select(row => new PortfolioIndexEntry(row.Username!, row.PublishedAtUtc!.Value)).ToListAsync(cancellationToken);
    }

    private async Task<T> InTransaction<T>(Func<PlatformDbContext, Task<T>> operation, CancellationToken cancellationToken)
    {
        for (var retry = 0; ; retry++)
        {
            await using var db = await factory.CreateDbContextAsync(cancellationToken);
            try
            {
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
                var result = await operation(db);
                await transaction.CommitAsync(cancellationToken);
                return result;
            }
            catch (Exception error) when (retry < 3 && IsRetryable(error))
            {
                await Task.Delay(25 * (retry + 1), cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new PortfolioConflictException("stale-revision");
            }
        }
    }

    private static bool IsRetryable(Exception error) => error is DbUpdateConcurrencyException
        || error is SqliteException { SqliteErrorCode: 5 or 6 or 19 }
        || error is PostgresException { SqlState: "40001" or "40P01" or "23505" }
        || error is SqlException { Number: 1205 or 2601 or 2627 or 3960 }
        // Provider execution strategies may wrap a serialization/deadlock failure in
        // InvalidOperationException around DbUpdateException. Retry the whole transaction.
        || error.InnerException is not null && IsRetryable(error.InnerException);
}
