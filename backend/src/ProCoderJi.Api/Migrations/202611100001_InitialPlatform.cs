using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Migrations;

[DbContext(typeof(PlatformDbContext))]
[Migration("202611100001_InitialPlatform")]
public sealed class InitialPlatform : Migration
{
    protected override void Up(MigrationBuilder migration)
    {
        migration.CreateTable("Users", columns: table => new
        {
            Id = table.Column<Guid>(nullable: false), GoogleSubject = table.Column<string>(maxLength: 255, nullable: false),
            Email = table.Column<string>(maxLength: 320, nullable: false), Name = table.Column<string>(maxLength: 200, nullable: false), CreatedAtUtc = table.Column<long>(nullable: false),
        }, constraints: table => table.PrimaryKey("PK_Users", user => user.Id));
        migration.CreateIndex("IX_Users_GoogleSubject", "Users", "GoogleSubject", unique: true);
        migration.CreateTable("DataProtectionKeys", columns: table => new
        {
            Id = table.Column<int>(nullable: false).Annotation("Sqlite:Autoincrement", true).Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
            FriendlyName = table.Column<string>(nullable: true), Xml = table.Column<string>(nullable: true),
        }, constraints: table => table.PrimaryKey("PK_DataProtectionKeys", key => key.Id));
        migration.CreateTable("ProgressStates", columns: table => new
        {
            UserId = table.Column<Guid>(nullable: false), Generation = table.Column<Guid>(nullable: false), Revision = table.Column<Guid>(nullable: false),
        }, constraints: table =>
        {
            table.PrimaryKey("PK_ProgressStates", state => state.UserId);
            table.ForeignKey("FK_ProgressStates_Users_UserId", state => state.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
        });
        migration.CreateTable("Attempts", columns: table => new
        {
            UserId = table.Column<Guid>(nullable: false), Id = table.Column<Guid>(nullable: false), Generation = table.Column<Guid>(nullable: false),
            TopicId = table.Column<string>(maxLength: 32, nullable: false), QuestionIdsJson = table.Column<string>(maxLength: 4096, nullable: false), ResponsesJson = table.Column<string>(maxLength: 8192, nullable: false),
            DurationSeconds = table.Column<int>(nullable: false), CompletedAtUtc = table.Column<long>(nullable: false),
        }, constraints: table =>
        {
            table.PrimaryKey("PK_Attempts", attempt => new { attempt.UserId, attempt.Id });
            table.ForeignKey("FK_Attempts_Users_UserId", attempt => attempt.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            table.CheckConstraint("CK_Attempt_Duration", "\"DurationSeconds\" >= 0 AND \"DurationSeconds\" <= 7200");
            table.CheckConstraint("CK_Attempt_Topic", "\"TopicId\" IN ('quantitative', 'reasoning', 'verbal', 'programming')");
            table.CheckConstraint("CK_Attempt_Payload", "length(\"QuestionIdsJson\") <= 4096 AND length(\"ResponsesJson\") <= 8192");
        });
        migration.CreateIndex("IX_Attempts_UserId_CompletedAtUtc", "Attempts", ["UserId", "CompletedAtUtc"]);
    }

    protected override void Down(MigrationBuilder migration)
    {
        migration.DropTable("Attempts"); migration.DropTable("ProgressStates"); migration.DropTable("DataProtectionKeys"); migration.DropTable("Users");
    }
}
