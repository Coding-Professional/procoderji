using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using ProCoderJi.Api.Data;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using ProCoderJi.Api.Features.Portfolio;

namespace ProCoderJi.Api.Migrations;

[DbContext(typeof(PlatformDbContext))]
public sealed class PlatformDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder model)
    {
        model.HasAnnotation("ProductVersion", "10.0.14");
        model.HasAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
        model.Entity("ProCoderJi.Api.Data.LearnerUser", entity =>
        {
            entity.Property<Guid>("Id").ValueGeneratedOnAdd();
            entity.Property<string>("GoogleSubject").IsRequired().HasMaxLength(255);
            entity.Property<string>("Email").IsRequired().HasMaxLength(320);
            entity.Property<string>("Name").IsRequired().HasMaxLength(200);
            entity.Property<long>("CreatedAtUtc");
            entity.HasKey("Id");
            entity.HasIndex("GoogleSubject").IsUnique();
            entity.ToTable("Users");
        });
        model.Entity("Microsoft.AspNetCore.DataProtection.EntityFrameworkCore.DataProtectionKey", entity =>
        {
            entity.Property<int>("Id").ValueGeneratedOnAdd().HasAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
            entity.Property<string>("FriendlyName");
            entity.Property<string>("Xml");
            entity.HasKey("Id");
            entity.ToTable("DataProtectionKeys");
        });
        model.Entity("ProCoderJi.Api.Data.ProgressState", entity =>
        {
            entity.Property<Guid>("UserId");
            entity.Property<Guid>("Generation");
            entity.Property<Guid>("Revision").IsConcurrencyToken();
            entity.HasKey("UserId");
            entity.ToTable("ProgressStates");
            entity.HasOne("ProCoderJi.Api.Data.LearnerUser", null).WithOne().HasForeignKey("ProCoderJi.Api.Data.ProgressState", "UserId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        model.Entity("ProCoderJi.Api.Data.PracticeAttemptEntity", entity =>
        {
            entity.Property<Guid>("UserId");
            entity.Property<Guid>("Id");
            entity.Property<Guid>("Generation");
            entity.Property<string>("TopicId").IsRequired().HasMaxLength(32);
            entity.Property<string>("QuestionIdsJson").IsRequired().HasMaxLength(4096);
            entity.Property<string>("ResponsesJson").IsRequired().HasMaxLength(8192);
            entity.Property<int>("DurationSeconds");
            entity.Property<long>("CompletedAtUtc");
            entity.HasKey("UserId", "Id");
            entity.HasIndex("UserId", "CompletedAtUtc");
            entity.ToTable("Attempts", table =>
            {
                table.HasCheckConstraint("CK_Attempt_Duration", "\"DurationSeconds\" >= 0 AND \"DurationSeconds\" <= 7200");
                table.HasCheckConstraint("CK_Attempt_Topic", "\"TopicId\" IN ('quantitative', 'reasoning', 'verbal', 'programming')");
                table.HasCheckConstraint("CK_Attempt_Payload", "length(\"QuestionIdsJson\") <= 4096 AND length(\"ResponsesJson\") <= 8192");
            });
            entity.HasOne("ProCoderJi.Api.Data.LearnerUser", null).WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
        model.Entity("ProCoderJi.Api.Data.PortfolioEntity", entity =>
        {
            entity.Property<Guid>("UserId").ValueGeneratedNever();
            entity.Property<string>("Username").HasMaxLength(30);
            entity.Property<string>("DraftJson").IsRequired().HasMaxLength(262144);
            entity.Property<string>("PublishedJson").HasMaxLength(262144);
            entity.Property<bool>("SearchVisible");
            entity.Property<bool>("PublishedSearchVisible");
            entity.Property<PortfolioStatus>("Status").HasConversion<string>().HasMaxLength(16).IsConcurrencyToken();
            entity.Property<Guid>("Revision").IsConcurrencyToken();
            entity.Property<long>("CreatedAtUtc");
            entity.Property<long>("UpdatedAtUtc");
            entity.Property<long?>("PublishedAtUtc");
            entity.Property<string>("PublishingPolicyVersion").HasMaxLength(16);
            entity.Property<long?>("EligibilityConfirmedAtUtc");
            entity.HasKey("UserId");
            entity.HasIndex("Username").IsUnique();
            entity.HasIndex("Status", "PublishedSearchVisible", "PublishingPolicyVersion", "Username").HasDatabaseName("IX_Portfolios_PublicIndex");
            entity.ToTable("Portfolios", table =>
            {
                table.HasCheckConstraint("CK_Portfolio_Status", "\"Status\" IN ('Draft', 'Published', 'Suspended')");
                table.HasCheckConstraint("CK_Portfolio_Publication", "\"Status\" <> 'Published' OR (\"Username\" IS NOT NULL AND \"PublishedJson\" IS NOT NULL)");
            });
            entity.HasOne("ProCoderJi.Api.Data.LearnerUser", null).WithOne().HasForeignKey("ProCoderJi.Api.Data.PortfolioEntity", "UserId").OnDelete(DeleteBehavior.Cascade).IsRequired();
        });
    }
}
