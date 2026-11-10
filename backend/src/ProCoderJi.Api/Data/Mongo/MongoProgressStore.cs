using MongoDB.Driver;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Features.Progress;

namespace ProCoderJi.Api.Data.Mongo;

/// <summary>
/// Each account's generation, revision and retained attempts are one document. Conditional replacement
/// serializes sync/reset races without cross-document transactions or a replica-set requirement.
/// </summary>
public sealed class MongoProgressStore(MongoPlatformDatabase database, MongoAccountStore accounts) : IProgressStore
{
    public async Task<ProgressSnapshot> Read(Guid userId, CancellationToken cancellationToken) =>
        Snapshot(await State(userId, cancellationToken));

    public async Task<ProgressSnapshot> Sync(Guid userId, Guid generation, IReadOnlyList<ValidatedAttempt> attempts, CancellationToken cancellationToken)
    {
        for (var retry = 0; retry < 8; retry++)
        {
            var state = await State(userId, cancellationToken);
            if (state.Generation != generation.ToString("D")) throw new ProgressGenerationConflictException();
            var merged = state.Attempts.ToDictionary(attempt => attempt.Id, StringComparer.Ordinal);
            foreach (var attempt in attempts)
                merged.TryAdd(attempt.Id.ToString("D"), MongoAttemptDocument.From(attempt));
            var next = new MongoProgressDocument
            {
                Id = state.Id, Generation = state.Generation, Revision = Guid.NewGuid().ToString("D"),
                Attempts = merged.Values.OrderByDescending(attempt => attempt.CompletedAtUtc)
                    .ThenByDescending(attempt => attempt.Id, StringComparer.Ordinal).Take(100).ToList()
            };
            var replaced = await database.Progress.ReplaceOneAsync(
                row => row.Id == state.Id && row.Revision == state.Revision && row.Generation == state.Generation,
                next, cancellationToken: cancellationToken);
            if (replaced.MatchedCount == 1) return Snapshot(next);
            await Task.Delay(10 * (retry + 1), cancellationToken);
        }
        throw new InvalidOperationException("Progress changed repeatedly. Retry the request.");
    }

    public async Task<Guid> Reset(Guid userId, CancellationToken cancellationToken)
    {
        var state = await State(userId, cancellationToken);
        var generation = Guid.NewGuid();
        // One atomic update also invalidates the revision read by every in-flight sync.
        await database.Progress.UpdateOneAsync(row => row.Id == state.Id,
            Builders<MongoProgressDocument>.Update.Set(row => row.Generation, generation.ToString("D"))
                .Set(row => row.Revision, Guid.NewGuid().ToString("D"))
                .Set(row => row.Attempts, []), cancellationToken: cancellationToken);
        return generation;
    }

    private async Task<MongoProgressDocument> State(Guid userId, CancellationToken cancellationToken)
    {
        var id = userId.ToString("D");
        var state = await database.Progress.Find(row => row.Id == id).SingleOrDefaultAsync(cancellationToken);
        if (state is not null) return state;
        if (!await accounts.Exists(userId, cancellationToken)) throw new InvalidOperationException("The learner account does not exist.");
        state = new MongoProgressDocument { Id = id, Generation = Guid.NewGuid().ToString("D"), Revision = Guid.NewGuid().ToString("D") };
        try { await database.Progress.InsertOneAsync(state, cancellationToken: cancellationToken); }
        catch (MongoWriteException error) when (error.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            return await database.Progress.Find(row => row.Id == id).SingleAsync(cancellationToken);
        }
        return state;
    }

    private static ProgressSnapshot Snapshot(MongoProgressDocument state) => new(
        state.Attempts.OrderByDescending(attempt => attempt.CompletedAtUtc)
            .ThenByDescending(attempt => attempt.Id, StringComparer.Ordinal).Select(attempt => attempt.ToDto()).ToArray(),
        Guid.Parse(state.Generation));
}
