namespace ProCoderJi.Api.Features.Portfolio;

public enum PortfolioStatus { Draft, Published, Suspended }

/// <summary>Private storage snapshot. Public responses must expose only the published fields.</summary>
public sealed record PortfolioRecord(
    Guid UserId, string? Username, string DraftJson, string? PublishedJson,
    bool SearchVisible, bool PublishedSearchVisible, PortfolioStatus Status,
    Guid Revision, long CreatedAtUtc, long UpdatedAtUtc, long? PublishedAtUtc,
    string? PublishingPolicyVersion = null, long? EligibilityConfirmedAtUtc = null);

public sealed record PortfolioIndexEntry(string Username, long PublishedAtUtc);

public sealed class PortfolioConflictException(string code) : Exception(code)
{
    public string Code { get; } = code;
}

/// <summary>Owner-scoped writes use a revision; public reads return published snapshots only.</summary>
public interface IPortfolioStore
{
    Task<PortfolioRecord?> GetOwner(Guid userId, CancellationToken cancellationToken);
    Task<PortfolioRecord?> GetPublished(string username, CancellationToken cancellationToken);
    Task<IReadOnlyList<PortfolioIndexEntry>> ListSearchVisible(string? after, int limit, CancellationToken cancellationToken);
    Task<bool> IsUsernameAvailable(string username, Guid userId, CancellationToken cancellationToken);
    Task<PortfolioRecord> SaveDraft(Guid userId, Guid? revision, string dataJson, bool searchVisible, CancellationToken cancellationToken);
    Task<PortfolioRecord> ClaimUsername(Guid userId, Guid? revision, string username, CancellationToken cancellationToken);
    Task<PortfolioRecord> Publish(Guid userId, Guid revision, CancellationToken cancellationToken, string? policyVersion = null);
    Task<PortfolioRecord> Unpublish(Guid userId, Guid revision, CancellationToken cancellationToken);
    Task<bool> Delete(Guid userId, Guid revision, CancellationToken cancellationToken);
}
