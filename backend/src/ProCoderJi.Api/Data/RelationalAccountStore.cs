using Microsoft.EntityFrameworkCore;

namespace ProCoderJi.Api.Data;

public sealed class RelationalAccountStore(IDbContextFactory<PlatformDbContext> factory) : IAccountStore
{
    public async Task<bool> Exists(Guid userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.Users.AnyAsync(user => user.Id == userId, cancellationToken);
    }

    public async Task<LearnerUser> SignIn(string subject, string email, string name, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(subject);
        if (subject.Length > 255) throw new ArgumentException("The Google subject is too long.", nameof(subject));
        var currentEmail = email[..Math.Min(email.Length, 320)];
        var currentName = name[..Math.Min(name.Length, 200)];
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var user = await db.Users.SingleOrDefaultAsync(user => user.GoogleSubject == subject, cancellationToken);
        if (user is null)
        {
            user = new LearnerUser
            {
                Id = Guid.NewGuid(), GoogleSubject = subject, Email = currentEmail, Name = currentName,
                CreatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            db.Users.Add(user);
            try { await db.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                user = await db.Users.SingleOrDefaultAsync(user => user.GoogleSubject == subject, cancellationToken);
                if (user is null) throw;
            }
        }
        if (user.Email != currentEmail || user.Name != currentName)
        {
            user.Email = currentEmail;
            user.Name = currentName;
            await db.SaveChangesAsync(cancellationToken);
        }
        return user;
    }
}
