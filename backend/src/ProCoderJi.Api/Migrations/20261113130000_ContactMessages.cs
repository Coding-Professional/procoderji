using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Migrations;

[DbContext(typeof(PlatformDbContext))]
[Migration("20261113130000_ContactMessages")]
public sealed class ContactMessagesMigration : Migration
{
    protected override void Up(MigrationBuilder migration)
    {
        migration.CreateTable("ContactMessages", columns: table => new
        {
            Id = table.Column<Guid>(nullable: false),
            Name = table.Column<string>(maxLength: 100, nullable: false),
            Email = table.Column<string>(maxLength: 254, nullable: false),
            Subject = table.Column<string>(maxLength: 160, nullable: false),
            Message = table.Column<string>(maxLength: 4000, nullable: false),
            CaptchaTokenHash = table.Column<string>(maxLength: 64, nullable: false),
            CreatedAtUtc = table.Column<long>(nullable: false)
        }, constraints: table => table.PrimaryKey("PK_ContactMessages", message => message.Id));
        migration.CreateIndex("IX_ContactMessages_CaptchaTokenHash", "ContactMessages", "CaptchaTokenHash", unique: true);
        migration.CreateIndex("IX_ContactMessages_CreatedAtUtc", "ContactMessages", "CreatedAtUtc");
    }
    protected override void Down(MigrationBuilder migration) => migration.DropTable("ContactMessages");
}
