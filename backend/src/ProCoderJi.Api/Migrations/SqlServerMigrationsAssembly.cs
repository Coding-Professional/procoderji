using System.Reflection;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Migrations;

/// <summary>
/// Shares the provider-aware migrations, but uses SQL Server's snapshot when checking model
/// changes. PostgreSQL and SQLite retain the original snapshot and migration history.
/// </summary>
public sealed class SqlServerMigrationsAssembly : IMigrationsAssembly
{
    public Assembly Assembly => typeof(InitialPlatform).Assembly;

    public IReadOnlyDictionary<string, TypeInfo> Migrations { get; } = typeof(InitialPlatform).Assembly.DefinedTypes
        .Where(type => typeof(Migration).IsAssignableFrom(type) && !type.IsAbstract
            && type.GetCustomAttribute<DbContextAttribute>()?.ContextType == typeof(PlatformDbContext))
        .Select(type => (Type: type, Id: type.GetCustomAttribute<MigrationAttribute>()?.Id))
        .Where(item => item.Id is not null)
        .OrderBy(item => item.Id, StringComparer.Ordinal)
        .ToDictionary(item => item.Id!, item => item.Type);

    public ModelSnapshot ModelSnapshot { get; } = new SqlServerPlatformDbContextModelSnapshot();

    public string? FindMigrationId(string nameOrId) => Migrations.Keys.FirstOrDefault(id =>
        id.Equals(nameOrId, StringComparison.OrdinalIgnoreCase)
        || id[(id.IndexOf('_') + 1)..].Equals(nameOrId, StringComparison.OrdinalIgnoreCase));

    public Migration CreateMigration(TypeInfo migrationClass, string activeProvider)
    {
        var migration = (Migration)Activator.CreateInstance(migrationClass.AsType())!;
        migration.ActiveProvider = activeProvider;
        return migration;
    }
}
