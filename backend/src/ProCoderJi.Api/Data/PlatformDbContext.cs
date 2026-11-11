using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Data;

public sealed class PlatformDbContext(DbContextOptions<PlatformDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<LearnerUser> Users => Set<LearnerUser>();
    public DbSet<ProgressState> ProgressStates => Set<ProgressState>();
    public DbSet<PracticeAttemptEntity> Attempts => Set<PracticeAttemptEntity>();
    public DbSet<PortfolioEntity> Portfolios => Set<PortfolioEntity>();
    public DbSet<DataProtectionKey> DataProtectionKeys { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<LearnerUser>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.Property(user => user.GoogleSubject).HasMaxLength(255);
            entity.HasIndex(user => user.GoogleSubject).IsUnique();
            entity.Property(user => user.Email).HasMaxLength(320);
            entity.Property(user => user.Name).HasMaxLength(200);
        });
        model.Entity<ProgressState>(entity =>
        {
            entity.HasKey(state => state.UserId);
            entity.Property(state => state.Revision).IsConcurrencyToken();
            entity.HasOne<LearnerUser>().WithOne().HasForeignKey<ProgressState>(state => state.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        model.Entity<PracticeAttemptEntity>(entity =>
        {
            entity.HasKey(attempt => new { attempt.UserId, attempt.Id });
            entity.HasIndex(attempt => new { attempt.UserId, attempt.CompletedAtUtc });
            entity.Property(attempt => attempt.TopicId).HasMaxLength(32);
            entity.Property(attempt => attempt.QuestionIdsJson).HasMaxLength(4096);
            entity.Property(attempt => attempt.ResponsesJson).HasMaxLength(8192);
            entity.HasOne<LearnerUser>().WithMany().HasForeignKey(attempt => attempt.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_Attempt_Duration", "\"DurationSeconds\" >= 0 AND \"DurationSeconds\" <= 7200");
                table.HasCheckConstraint("CK_Attempt_Topic", "\"TopicId\" IN ('quantitative', 'reasoning', 'verbal', 'programming')");
                table.HasCheckConstraint("CK_Attempt_Payload", Database.IsSqlServer()
                    ? "DATALENGTH([QuestionIdsJson]) <= 8192 AND DATALENGTH([ResponsesJson]) <= 16384"
                    : "length(\"QuestionIdsJson\") <= 4096 AND length(\"ResponsesJson\") <= 8192");
            });
        });
        model.Entity<PortfolioEntity>(entity =>
        {
            entity.HasKey(portfolio => portfolio.UserId);
            entity.Property(portfolio => portfolio.UserId).ValueGeneratedNever();
            entity.Property(portfolio => portfolio.Username).HasMaxLength(30);
            entity.HasIndex(portfolio => portfolio.Username).IsUnique()
                .HasFilter(Database.IsSqlServer() ? "[Username] IS NOT NULL" : null);
            entity.Property(portfolio => portfolio.DraftJson).HasMaxLength(262144);
            entity.Property(portfolio => portfolio.PublishedJson).HasMaxLength(262144);
            entity.Property(portfolio => portfolio.PublishingPolicyVersion).HasMaxLength(16);
            entity.HasIndex(portfolio => new { portfolio.Status, portfolio.PublishedSearchVisible, portfolio.PublishingPolicyVersion, portfolio.Username })
                .HasDatabaseName("IX_Portfolios_PublicIndex");
            entity.Property(portfolio => portfolio.Status).HasConversion<string>().HasMaxLength(16).IsConcurrencyToken();
            entity.Property(portfolio => portfolio.Revision).IsConcurrencyToken();
            entity.HasOne<LearnerUser>().WithOne().HasForeignKey<PortfolioEntity>(portfolio => portfolio.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_Portfolio_Status", "\"Status\" IN ('Draft', 'Published', 'Suspended')");
                table.HasCheckConstraint("CK_Portfolio_Publication", "\"Status\" <> 'Published' OR (\"Username\" IS NOT NULL AND \"PublishedJson\" IS NOT NULL)");
            });
        });
    }
}

public sealed class LearnerUser
{
    public Guid Id { get; set; }
    public required string GoogleSubject { get; set; }
    public required string Email { get; set; }
    public required string Name { get; set; }
    public long CreatedAtUtc { get; set; }
}

public sealed class ProgressState
{
    public Guid UserId { get; set; }
    public Guid Generation { get; set; }
    public Guid Revision { get; set; }
}

public sealed class PracticeAttemptEntity
{
    public Guid UserId { get; set; }
    public Guid Id { get; set; }
    public Guid Generation { get; set; }
    public required string TopicId { get; set; }
    public required string QuestionIdsJson { get; set; }
    public required string ResponsesJson { get; set; }
    public int DurationSeconds { get; set; }
    public long CompletedAtUtc { get; set; }
}

public sealed class PortfolioEntity
{
    public Guid UserId { get; set; }
    public string? Username { get; set; }
    public required string DraftJson { get; set; }
    public string? PublishedJson { get; set; }
    public bool SearchVisible { get; set; }
    public bool PublishedSearchVisible { get; set; }
    public PortfolioStatus Status { get; set; }
    public Guid Revision { get; set; }
    public long CreatedAtUtc { get; set; }
    public long UpdatedAtUtc { get; set; }
    public long? PublishedAtUtc { get; set; }
    public string? PublishingPolicyVersion { get; set; }
    public long? EligibilityConfirmedAtUtc { get; set; }
}
