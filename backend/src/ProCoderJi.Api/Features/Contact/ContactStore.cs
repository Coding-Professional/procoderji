using Microsoft.EntityFrameworkCore;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;

namespace ProCoderJi.Api.Features.Contact;

public sealed class ContactMessage
{
    [BsonRepresentation(MongoDB.Bson.BsonType.String)]
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Subject { get; set; }
    public required string Message { get; set; }
    public required string CaptchaTokenHash { get; set; }
    public long CreatedAtUtc { get; set; }
}

public interface IContactStore
{
    /// <returns>False if this CAPTCHA token has already been used.</returns>
    Task<bool> Save(ContactMessage message, CancellationToken cancellationToken);
}

public sealed class RelationalContactStore(PlatformDbContext database) : IContactStore
{
    public async Task<bool> Save(ContactMessage message, CancellationToken cancellationToken)
    {
        database.ContactMessages.Add(message);
        try { await database.SaveChangesAsync(cancellationToken); return true; }
        catch (DbUpdateException)
        {
            database.Entry(message).State = EntityState.Detached;
            if (await database.ContactMessages.AnyAsync(row => row.CaptchaTokenHash == message.CaptchaTokenHash, cancellationToken)) return false;
            throw;
        }
    }
}

public sealed class MongoContactStore(MongoPlatformDatabase database) : IContactStore
{
    public async Task<bool> Save(ContactMessage message, CancellationToken cancellationToken)
    {
        try { await database.ContactMessages.InsertOneAsync(message, cancellationToken: cancellationToken); return true; }
        catch (MongoWriteException exception) when (exception.WriteError.Category == ServerErrorCategory.DuplicateKey) { return false; }
    }
}
