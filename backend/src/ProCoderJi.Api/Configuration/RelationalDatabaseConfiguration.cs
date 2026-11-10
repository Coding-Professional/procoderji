using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Migrations;

namespace ProCoderJi.Api.Configuration;

/// <summary>Relational storage for SQLite development, PostgreSQL, or SQL Server.</summary>
public static class RelationalDatabaseConfiguration
{
    public static IServiceCollection AddRelationalDatabase(this IServiceCollection services)
    {
        services.AddDbContextFactory<PlatformDbContext>((provider, options) =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            Configure(options, configuration, provider.GetRequiredService<IHostEnvironment>().ContentRootPath);
        });
        return services;
    }

    public static void Configure(DbContextOptionsBuilder options, IConfiguration configuration, string contentRoot)
    {
        var provider = configuration["Database:Provider"] ?? "Sqlite";
        var connection = configuration.GetConnectionString("Platform");
        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            var sqlite = new SqliteConnectionStringBuilder(connection ?? "Data Source=Data/procoderji.db");
            if (sqlite.DataSource != ":memory:" && !Path.IsPathRooted(sqlite.DataSource))
                sqlite.DataSource = Path.Combine(contentRoot, sqlite.DataSource);
            if (sqlite.DataSource != ":memory:") Directory.CreateDirectory(Path.GetDirectoryName(sqlite.DataSource)!);
            options.UseSqlite(sqlite.ConnectionString);
        }
        else if (provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(connection))
            options.UseNpgsql(connection);
        else if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(connection))
            // ProgressService retries its whole serializable transaction. A provider execution
            // strategy would reject those explicit transactions or replay only part of the work.
            options.UseSqlServer(connection).ReplaceService<IMigrationsAssembly, SqlServerMigrationsAssembly>();
        else
            throw new InvalidOperationException("Choose Sqlite, or configure Postgres/SqlServer with ConnectionStrings:Platform.");
    }
}
