using ProCoderJi.Api.Features.Practice;

namespace ProCoderJi.Api.Features.Progress;

public interface IProgressStore
{
    Task<ProgressSnapshot> Read(Guid userId, CancellationToken cancellationToken);
    Task<ProgressSnapshot> Sync(Guid userId, Guid generation, IReadOnlyList<ValidatedAttempt> attempts, CancellationToken cancellationToken);
    Task<Guid> Reset(Guid userId, CancellationToken cancellationToken);
}
