using MongoDB.Driver;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Data.Mongo;

/// <summary>Each write replaces only the owner's embedded portfolio under its expected revision.</summary>
public sealed class MongoPortfolioStore(MongoPlatformDatabase database) : IPortfolioStore
{
    public async Task<PortfolioRecord?> GetOwner(Guid userId, CancellationToken cancellationToken)
    {
        var user = await database.Users.Find(row => row.Id == userId.ToString("D")).SingleOrDefaultAsync(cancellationToken);
        return user?.Portfolio?.ToRecord(userId);
    }

    public async Task<PortfolioRecord?> GetPublished(string username, CancellationToken cancellationToken)
    {
        var user = await database.Users.Find(row => row.Portfolio != null && row.Portfolio.Username == username
            && row.Portfolio.Status == PortfolioStatus.Published && row.Portfolio.PublishedJson != null)
            .SingleOrDefaultAsync(cancellationToken);
        return user?.Portfolio?.ToRecord(Guid.Parse(user.Id));
    }

    public async Task<bool> IsUsernameAvailable(string username, Guid userId, CancellationToken cancellationToken) =>
        !await database.Users.Find(row => row.Id != userId.ToString("D") && row.Portfolio != null
            && row.Portfolio.Username == username).AnyAsync(cancellationToken);

    public Task<PortfolioRecord> SaveDraft(Guid userId, Guid? revision, string dataJson, bool searchVisible, CancellationToken cancellationToken) =>
        Write(userId, revision, allowCreate: true, (current, _) => current with
        {
            DraftJson = dataJson, SearchVisible = searchVisible
        }, cancellationToken);

    public Task<PortfolioRecord> ClaimUsername(Guid userId, Guid? revision, string username, CancellationToken cancellationToken) =>
        Write(userId, revision, allowCreate: true, (current, _) =>
        {
            if (current.Username is not null && current.Username != username)
                throw new PortfolioConflictException("username-locked");
            return current with { Username = username };
        }, cancellationToken);

    public Task<PortfolioRecord> Publish(Guid userId, Guid revision, CancellationToken cancellationToken, string? policyVersion = null) =>
        Write(userId, revision, allowCreate: false, (current, now) =>
        {
            if (current.Status == PortfolioStatus.Suspended) throw new PortfolioConflictException("suspended");
            if (current.Username is null) throw new PortfolioConflictException("username-required");
            return current with
            {
                Status = PortfolioStatus.Published, PublishedJson = current.DraftJson,
                PublishedSearchVisible = current.SearchVisible, PublishedAtUtc = now,
                PublishingPolicyVersion = policyVersion, EligibilityConfirmedAtUtc = policyVersion is null ? null : now
            };
        }, cancellationToken);

    public async Task<IReadOnlyList<PortfolioIndexEntry>> ListSearchVisible(string? after, int limit, CancellationToken cancellationToken)
    {
        var filter = Builders<MongoUserDocument>.Filter.Where(row => row.Portfolio != null
            && row.Portfolio.Status == PortfolioStatus.Published && row.Portfolio.PublishedJson != null
            && row.Portfolio.Username != null && row.Portfolio.PublishedSearchVisible
            && row.Portfolio.PublishingPolicyVersion == PortfolioPublishingPolicy.Version
            && row.Portfolio.EligibilityConfirmedAtUtc != null && row.Portfolio.PublishedAtUtc != null);
        if (after is not null) filter &= Builders<MongoUserDocument>.Filter.Gt("Portfolio.Username", after);
        return await database.Users.Find(filter).SortBy(row => row.Portfolio!.Username).Limit(limit)
            .Project(row => new PortfolioIndexEntry(row.Portfolio!.Username!, row.Portfolio.PublishedAtUtc!.Value))
            .ToListAsync(cancellationToken);
    }

    public Task<PortfolioRecord> Unpublish(Guid userId, Guid revision, CancellationToken cancellationToken) =>
        Write(userId, revision, allowCreate: false, (current, _) => current with
        {
            Status = current.Status == PortfolioStatus.Suspended ? PortfolioStatus.Suspended : PortfolioStatus.Draft,
            PublishedJson = null, PublishedSearchVisible = false
        }, cancellationToken);

    public async Task<bool> Delete(Guid userId, Guid revision, CancellationToken cancellationToken)
    {
        var user = await User(userId, cancellationToken);
        if (user.Portfolio is null) return false;
        if (user.Portfolio.Revision != revision.ToString("D")) throw new PortfolioConflictException("stale-revision");
        if (user.Portfolio.Status == PortfolioStatus.Suspended) throw new PortfolioConflictException("suspended");
        var filter = RevisionFilter(userId, revision)
            & Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio!.Status, user.Portfolio.Status);
        var result = await database.Users.UpdateOneAsync(filter,
            Builders<MongoUserDocument>.Update.Unset(row => row.Portfolio), cancellationToken: cancellationToken);
        if (result.MatchedCount == 1) return true;
        var latest = await User(userId, cancellationToken);
        if (latest.Portfolio is null) return false;
        if (latest.Portfolio.Status == PortfolioStatus.Suspended) throw new PortfolioConflictException("suspended");
        throw new PortfolioConflictException("stale-revision");
    }

    private async Task<PortfolioRecord> Write(Guid userId, Guid? revision, bool allowCreate,
        Func<PortfolioRecord, long, PortfolioRecord> change, CancellationToken cancellationToken)
    {
        var user = await User(userId, cancellationToken);
        var current = user.Portfolio?.ToRecord(userId);
        if (current is null && !allowCreate) throw new PortfolioConflictException("not-found");
        if (current?.Revision != revision) throw new PortfolioConflictException("stale-revision");
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        current ??= new PortfolioRecord(userId, null, "{}", null, false, false,
            PortfolioStatus.Draft, Guid.Empty, now, now, null);
        var next = change(current, now) with { Revision = Guid.NewGuid(), UpdatedAtUtc = now };
        UpdateResult result;
        try
        {
            var filter = RevisionFilter(userId, revision);
            // Also preserve an operator's concurrent status change, including a suspension
            // written by an administrative tool that has not advanced the revision.
            if (user.Portfolio is not null)
                filter &= Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio!.Status, user.Portfolio.Status);
            result = await database.Users.UpdateOneAsync(filter,
                Builders<MongoUserDocument>.Update.Set(row => row.Portfolio, MongoPortfolioDocument.From(next)),
                cancellationToken: cancellationToken);
        }
        catch (Exception error) when (IsDuplicateKey(error))
        {
            throw new PortfolioConflictException("username-taken");
        }
        if (result.MatchedCount == 1) return next;
        if (!await database.Users.Find(row => row.Id == userId.ToString("D")).AnyAsync(cancellationToken))
            throw new PortfolioConflictException("account-not-found");
        throw new PortfolioConflictException("stale-revision");
    }

    private async Task<MongoUserDocument> User(Guid userId, CancellationToken cancellationToken) =>
        await database.Users.Find(row => row.Id == userId.ToString("D")).SingleOrDefaultAsync(cancellationToken)
        ?? throw new PortfolioConflictException("account-not-found");

    private static FilterDefinition<MongoUserDocument> RevisionFilter(Guid userId, Guid? revision)
    {
        var filter = Builders<MongoUserDocument>.Filter.Eq(row => row.Id, userId.ToString("D"));
        return filter & (revision is null
            ? Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio, null)
            : Builders<MongoUserDocument>.Filter.Eq("Portfolio.Revision", revision.Value.ToString("D")));
    }

    private static bool IsDuplicateKey(Exception error) => error is MongoCommandException { Code: 11000 or 11001 }
        or MongoWriteException { WriteError.Category: ServerErrorCategory.DuplicateKey };
}
