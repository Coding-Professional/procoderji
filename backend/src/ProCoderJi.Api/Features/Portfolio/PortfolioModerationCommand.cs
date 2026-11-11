using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;
using Npgsql;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;

namespace ProCoderJi.Api.Features.Portfolio;

public sealed record PortfolioModerationResult(string Username, string Status, Guid Revision);

/// <summary>
/// An operator-only process command. It exposes no HTTP route and uses the deployment's
/// database credentials. Updates use the same revision/status boundary as student edits.
/// </summary>
public static class PortfolioModerationCommand
{
    private const string Usage = "Use --portfolio suspend|restore --username <username>. Use --portfolio help for this syntax.";
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static bool IsRequested(string[] args) => args.Any(argument =>
        argument.Equals("--portfolio", StringComparison.OrdinalIgnoreCase)
        || argument.StartsWith("--portfolio=", StringComparison.OrdinalIgnoreCase));

    /// <returns>Null for normal server startup; otherwise the operator command's exit code.</returns>
    public static async Task<int?> TryRun(string[] args, IServiceProvider services,
        CancellationToken cancellationToken = default, TextWriter? output = null, TextWriter? error = null)
    {
        if (!IsRequested(args)) return null;
        output ??= Console.Out;
        error ??= Console.Error;
        if (args is ["--portfolio", "help"])
        {
            await output.WriteLineAsync(Usage);
            return 0;
        }
        if (!TryParse(args, out var action, out var username) || username is null)
        {
            await error.WriteLineAsync(Usage);
            return 2;
        }
        // Reserved/blocked names must remain operable if an older rule ever allowed one.
        // All shape and character checks still apply to the operator's selector.
        if (PortfolioValidator.CreateDefault().ValidateUsername(username)
            .Any(problem => problem.Code is not ("reserved" or "blocked-word")))
        {
            await error.WriteLineAsync("The portfolio username has an invalid format.");
            return 2;
        }
        try
        {
            await using var scope = services.CreateAsyncScope();
            var provider = scope.ServiceProvider;
            var mongo = string.Equals(provider.GetRequiredService<IConfiguration>()["Database:Provider"], "MongoDb", StringComparison.OrdinalIgnoreCase);
            var result = mongo
                ? await ApplyMongo(provider.GetRequiredService<MongoPlatformDatabase>(), username, action == "suspend", cancellationToken)
                : await ApplyRelational(provider.GetRequiredService<IDbContextFactory<PlatformDbContext>>(), username, action == "suspend", cancellationToken);
            if (result is null)
            {
                await error.WriteLineAsync("Portfolio not found.");
                return 3;
            }
            await output.WriteLineAsync(JsonSerializer.Serialize(result, Json));
            return 0;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await error.WriteLineAsync("Portfolio moderation was cancelled.");
            return 130;
        }
        catch (Exception)
        {
            // Provider exceptions can contain deployment details. Do not write them or
            // any student portfolio fields to the operator command's public output.
            await error.WriteLineAsync("Portfolio moderation failed. Check operator access and database readiness.");
            return 1;
        }
    }

    private static bool TryParse(string[] args, out string? action, out string? username)
    {
        action = null;
        username = null;
        if (args.Length != 4) return false;
        for (var index = 0; index < args.Length; index += 2)
        {
            if (args[index] == "--portfolio" && action is null) action = args[index + 1];
            else if (args[index] == "--username" && username is null) username = args[index + 1];
            else return false;
        }
        return action is "suspend" or "restore" && username is not null;
    }

    private static async Task<PortfolioModerationResult?> ApplyRelational(IDbContextFactory<PlatformDbContext> factory,
        string username, bool suspend, CancellationToken cancellationToken)
    {
        for (var retry = 0; retry < 4; retry++)
        {
            await using var db = await factory.CreateDbContextAsync(cancellationToken);
            try
            {
                var current = await db.Portfolios.AsNoTracking().SingleOrDefaultAsync(row => row.Username == username, cancellationToken);
                if (current is null) return null;
                if (suspend && current.Status == PortfolioStatus.Suspended || !suspend && current.Status != PortfolioStatus.Suspended)
                    return Result(username, current.Status, current.Revision);
                var status = suspend ? PortfolioStatus.Suspended : PortfolioStatus.Draft;
                var revision = Guid.NewGuid();
                var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                var changed = await db.Portfolios.Where(row => row.UserId == current.UserId
                    && row.Revision == current.Revision && row.Status == current.Status)
                    .ExecuteUpdateAsync(update => update
                        .SetProperty(row => row.Status, status)
                        .SetProperty(row => row.Revision, revision)
                        .SetProperty(row => row.UpdatedAtUtc, now)
                        .SetProperty(row => row.PublishedJson, (string?)null)
                        .SetProperty(row => row.PublishedSearchVisible, false)
                        .SetProperty(row => row.PublishingPolicyVersion, (string?)null)
                        .SetProperty(row => row.EligibilityConfirmedAtUtc, (long?)null), cancellationToken);
                if (changed == 1) return Result(username, status, revision);
            }
            catch (Exception exception) when (retry < 3 && IsRetryable(exception))
            {
                await Task.Delay(25 * (retry + 1), cancellationToken);
            }
        }
        throw new InvalidOperationException("Portfolio changed repeatedly during moderation.");
    }

    private static async Task<PortfolioModerationResult?> ApplyMongo(MongoPlatformDatabase database,
        string username, bool suspend, CancellationToken cancellationToken)
    {
        for (var retry = 0; retry < 4; retry++)
        {
            var current = await database.Users.Find(row => row.Portfolio != null && row.Portfolio.Username == username)
                .SingleOrDefaultAsync(cancellationToken);
            if (current?.Portfolio is null) return null;
            var portfolio = current.Portfolio;
            if (suspend && portfolio.Status == PortfolioStatus.Suspended || !suspend && portfolio.Status != PortfolioStatus.Suspended)
                return Result(username, portfolio.Status, Guid.Parse(portfolio.Revision));
            var status = suspend ? PortfolioStatus.Suspended : PortfolioStatus.Draft;
            var revision = Guid.NewGuid();
            var filter = Builders<MongoUserDocument>.Filter.Eq(row => row.Id, current.Id)
                & Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio!.Username, username)
                & Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio!.Revision, portfolio.Revision)
                & Builders<MongoUserDocument>.Filter.Eq(row => row.Portfolio!.Status, portfolio.Status);
            var updated = await database.Users.UpdateOneAsync(filter, Builders<MongoUserDocument>.Update
                .Set(row => row.Portfolio!.Status, status)
                .Set(row => row.Portfolio!.Revision, revision.ToString("D"))
                .Set(row => row.Portfolio!.UpdatedAtUtc, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds())
                .Unset(row => row.Portfolio!.PublishedJson)
                .Set(row => row.Portfolio!.PublishedSearchVisible, false)
                .Unset(row => row.Portfolio!.PublishingPolicyVersion)
                .Unset(row => row.Portfolio!.EligibilityConfirmedAtUtc), cancellationToken: cancellationToken);
            if (updated.MatchedCount == 1) return Result(username, status, revision);
        }
        throw new InvalidOperationException("Portfolio changed repeatedly during moderation.");
    }

    private static PortfolioModerationResult Result(string username, PortfolioStatus status, Guid revision) =>
        new(username, status.ToString().ToLowerInvariant(), revision);

    private static bool IsRetryable(Exception error) => error is SqliteException { SqliteErrorCode: 5 or 6 }
        || error is PostgresException { SqlState: "40001" or "40P01" }
        || error is SqlException { Number: 1205 or 3960 }
        || error.InnerException is not null && IsRetryable(error.InnerException);
}
