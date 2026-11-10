using MongoDB.Driver;

namespace ProCoderJi.Api.Data.Mongo;

public sealed class MongoAccountStore(MongoPlatformDatabase database) : IAccountStore
{
    public Task<bool> Exists(Guid userId, CancellationToken cancellationToken) =>
        database.Users.Find(user => user.Id == userId.ToString("D")).AnyAsync(cancellationToken);

    public async Task<LearnerUser> SignIn(string subject, string email, string name, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subject);
        if (subject.Length > 255) throw new ArgumentException("The Google subject is too long.", nameof(subject));
        var update = Builders<MongoUserDocument>.Update
            .SetOnInsert(user => user.Id, Guid.NewGuid().ToString("D"))
            .SetOnInsert(user => user.GoogleSubject, subject)
            .SetOnInsert(user => user.CreatedAtUtc, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())
            .Set(user => user.Email, email[..Math.Min(email.Length, 320)])
            .Set(user => user.Name, name[..Math.Min(name.Length, 200)]);
        var options = new FindOneAndUpdateOptions<MongoUserDocument> { IsUpsert = true, ReturnDocument = ReturnDocument.After };
        try
        {
            return (await database.Users.FindOneAndUpdateAsync(user => user.GoogleSubject == subject, update, options, cancellationToken)).ToUser();
        }
        catch (Exception error) when (error is MongoCommandException { Code: 11000 or 11001 }
            or MongoWriteException { WriteError.Category: ServerErrorCategory.DuplicateKey })
        {
            // Two first logins may race the unique subject index. The winner owns the identity.
            options.IsUpsert = false;
            return (await database.Users.FindOneAndUpdateAsync(user => user.GoogleSubject == subject, update, options, cancellationToken)).ToUser();
        }
    }
}
