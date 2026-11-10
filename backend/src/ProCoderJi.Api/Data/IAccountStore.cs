namespace ProCoderJi.Api.Data;

/// <summary>The authenticated account boundary, independent of the persistence provider.</summary>
public interface IAccountStore
{
    Task<bool> Exists(Guid userId, CancellationToken cancellationToken);
    Task<LearnerUser> SignIn(string subject, string email, string name, CancellationToken cancellationToken);
}
