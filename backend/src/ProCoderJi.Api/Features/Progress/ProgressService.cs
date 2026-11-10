using System.Data;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Features.Practice;

namespace ProCoderJi.Api.Features.Progress;

public sealed record ProgressSnapshot(IReadOnlyList<ProgressAttemptDto> Attempts, Guid Generation);
public sealed class ProgressGenerationConflictException : Exception { }

public sealed class ProgressService(IDbContextFactory<PlatformDbContext> factory) : IProgressStore
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public Task<ProgressSnapshot> Read(Guid userId, CancellationToken cancellationToken) => InTransaction(async db =>
    {
        var state = await State(db, userId, cancellationToken);
        return await Snapshot(db, state, cancellationToken);
    }, cancellationToken);

    public Task<ProgressSnapshot> Sync(Guid userId, Guid generation, IReadOnlyList<ValidatedAttempt> attempts, CancellationToken cancellationToken) => InTransaction(async db =>
    {
        var state = await State(db, userId, cancellationToken);
        if (state.Generation != generation) throw new ProgressGenerationConflictException();
        var ids = attempts.Select(attempt => attempt.Id).ToArray();
        var existing = await db.Attempts.Where(attempt => attempt.UserId == userId && ids.Contains(attempt.Id)).Select(attempt => attempt.Id).ToListAsync(cancellationToken);
        foreach (var attempt in attempts.Where(attempt => !existing.Contains(attempt.Id)))
            db.Attempts.Add(new PracticeAttemptEntity
            {
                Id = attempt.Id, UserId = userId, Generation = generation, TopicId = attempt.TopicId,
                QuestionIdsJson = JsonSerializer.Serialize(attempt.QuestionIds, Json), ResponsesJson = JsonSerializer.Serialize(attempt.Responses, Json),
                CompletedAtUtc = attempt.CompletedAt.ToUnixTimeMilliseconds(), DurationSeconds = attempt.DurationSeconds,
            });
        state.Revision = Guid.NewGuid();
        await db.SaveChangesAsync(cancellationToken);
        var old = await db.Attempts.Where(attempt => attempt.UserId == userId).OrderByDescending(attempt => attempt.CompletedAtUtc).ThenByDescending(attempt => attempt.Id).Skip(100).ToListAsync(cancellationToken);
        db.Attempts.RemoveRange(old);
        await db.SaveChangesAsync(cancellationToken);
        return await Snapshot(db, state, cancellationToken);
    }, cancellationToken);

    public Task<Guid> Reset(Guid userId, CancellationToken cancellationToken) => InTransaction(async db =>
    {
        var state = await State(db, userId, cancellationToken);
        var attempts = await db.Attempts.Where(attempt => attempt.UserId == userId).ToListAsync(cancellationToken);
        db.Attempts.RemoveRange(attempts);
        state.Generation = Guid.NewGuid();
        state.Revision = Guid.NewGuid();
        await db.SaveChangesAsync(cancellationToken);
        return state.Generation;
    }, cancellationToken);

    private static async Task<ProgressState> State(PlatformDbContext db, Guid userId, CancellationToken cancellationToken)
    {
        var state = await db.ProgressStates.SingleOrDefaultAsync(state => state.UserId == userId, cancellationToken);
        if (state is not null) return state;
        state = new ProgressState { UserId = userId, Generation = Guid.NewGuid(), Revision = Guid.NewGuid() };
        db.ProgressStates.Add(state);
        await db.SaveChangesAsync(cancellationToken);
        return state;
    }

    private static async Task<ProgressSnapshot> Snapshot(PlatformDbContext db, ProgressState state, CancellationToken cancellationToken)
    {
        var rows = await db.Attempts.AsNoTracking().Where(attempt => attempt.UserId == state.UserId && attempt.Generation == state.Generation)
            .OrderByDescending(attempt => attempt.CompletedAtUtc).ThenByDescending(attempt => attempt.Id).Take(100).ToListAsync(cancellationToken);
        var attempts = rows.Select(row => new ValidatedAttempt(row.Id, DateTimeOffset.FromUnixTimeMilliseconds(row.CompletedAtUtc), row.TopicId,
            JsonSerializer.Deserialize<string[]>(row.QuestionIdsJson, Json) ?? [], JsonSerializer.Deserialize<PracticeResponseDto[]>(row.ResponsesJson, Json) ?? [], row.DurationSeconds).ToDto()).ToArray();
        return new ProgressSnapshot(attempts, state.Generation);
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
        }
    }

    private static bool IsRetryable(Exception error) => error is DbUpdateConcurrencyException
        || error is SqliteException { SqliteErrorCode: 5 or 6 }
        || error is PostgresException { SqlState: "40001" or "40P01" or "23505" }
        || error is SqlException { Number: 1205 or 2601 or 2627 or 3960 }
        || error is DbUpdateException { InnerException: not null } update && IsRetryable(update.InnerException!);
}
