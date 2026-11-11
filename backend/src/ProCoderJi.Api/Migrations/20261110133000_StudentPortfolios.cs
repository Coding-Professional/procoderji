using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Migrations;

[DbContext(typeof(PlatformDbContext))]
[Migration("20261110133000_StudentPortfolios")]
public sealed class StudentPortfolios : Migration
{
    protected override void Up(MigrationBuilder migration)
    {
        migration.CreateTable("Portfolios", columns: table => new
        {
            UserId = table.Column<Guid>(nullable: false), Username = table.Column<string>(maxLength: 30, nullable: true),
            DraftJson = table.Column<string>(maxLength: 262144, nullable: false), PublishedJson = table.Column<string>(maxLength: 262144, nullable: true),
            SearchVisible = table.Column<bool>(nullable: false), PublishedSearchVisible = table.Column<bool>(nullable: false),
            Status = table.Column<string>(maxLength: 16, nullable: false), Revision = table.Column<Guid>(nullable: false),
            CreatedAtUtc = table.Column<long>(nullable: false), UpdatedAtUtc = table.Column<long>(nullable: false), PublishedAtUtc = table.Column<long>(nullable: true),
        }, constraints: table =>
        {
            table.PrimaryKey("PK_Portfolios", portfolio => portfolio.UserId);
            table.ForeignKey("FK_Portfolios_Users_UserId", portfolio => portfolio.UserId, "Users", "Id", onDelete: ReferentialAction.Cascade);
            table.CheckConstraint("CK_Portfolio_Status", "\"Status\" IN ('Draft', 'Published', 'Suspended')");
            table.CheckConstraint("CK_Portfolio_Publication", "\"Status\" <> 'Published' OR (\"Username\" IS NOT NULL AND \"PublishedJson\" IS NOT NULL)");
        });
        migration.CreateIndex("IX_Portfolios_Username", "Portfolios", "Username", unique: true,
            filter: ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer" ? "[Username] IS NOT NULL" : null);
    }

    protected override void Down(MigrationBuilder migration) => migration.DropTable("Portfolios");
}
