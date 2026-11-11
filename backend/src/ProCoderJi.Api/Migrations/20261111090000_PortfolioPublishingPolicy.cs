using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Migrations;

[DbContext(typeof(PlatformDbContext))]
[Migration("20261111090000_PortfolioPublishingPolicy")]
public sealed class PortfolioPublishingPolicyMigration : Migration
{
    protected override void Up(MigrationBuilder migration)
    {
        migration.AddColumn<string>("PublishingPolicyVersion", "Portfolios", maxLength: 16, nullable: true);
        migration.AddColumn<long>("EligibilityConfirmedAtUtc", "Portfolios", nullable: true);
        migration.CreateIndex("IX_Portfolios_PublicIndex", "Portfolios", ["Status", "PublishedSearchVisible", "PublishingPolicyVersion", "Username"]);
    }

    protected override void Down(MigrationBuilder migration)
    {
        migration.DropIndex("IX_Portfolios_PublicIndex", "Portfolios");
        migration.DropColumn("PublishingPolicyVersion", "Portfolios");
        migration.DropColumn("EligibilityConfirmedAtUtc", "Portfolios");
    }
}
