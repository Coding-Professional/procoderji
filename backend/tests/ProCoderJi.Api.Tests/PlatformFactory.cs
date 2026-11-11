using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using MongoDB.Driver;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;

namespace ProCoderJi.Api.Tests;

public sealed class PlatformFactory(bool googleConfigured = false, string publicOrigin = "http://localhost:3000", bool testAuthentication = true, IReadOnlyDictionary<string, string?>? overrides = null) : WebApplicationFactory<Program>
{
    private readonly string sqlitePath = Path.Combine(Path.GetTempPath(), $"procoderji-{Guid.NewGuid():N}.db");
    private readonly string? postgresConnection = Environment.GetEnvironmentVariable("PROCODERJI_TEST_POSTGRES");
    private readonly string? sqlServerConnection = Environment.GetEnvironmentVariable("PROCODERJI_TEST_SQLSERVER");
    private readonly string? mongoConnection = Environment.GetEnvironmentVariable("PROCODERJI_TEST_MONGODB");
    private string? schema;
    private string? sqlServerDatabase;
    private string? mongoDatabase;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        var connection = $"Data Source={sqlitePath};Pooling=False";
        var provider = "Sqlite";
        if (new[] { postgresConnection, sqlServerConnection, mongoConnection }.Count(value => !string.IsNullOrWhiteSpace(value)) > 1)
            throw new InvalidOperationException("Set only one database integration-test connection at a time.");
        if (!string.IsNullOrWhiteSpace(postgresConnection))
        {
            provider = "Postgres";
            schema = "procoderji_test_" + Guid.NewGuid().ToString("N");
            using var admin = new NpgsqlConnection(postgresConnection);
            admin.Open();
            using var command = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", admin);
            command.ExecuteNonQuery();
            connection = new NpgsqlConnectionStringBuilder(postgresConnection) { SearchPath = schema }.ConnectionString;
        }
        else if (!string.IsNullOrWhiteSpace(sqlServerConnection))
        {
            provider = "SqlServer";
            var isolatedDatabase = "procoderji_test_" + Guid.NewGuid().ToString("N");
            using var admin = new SqlConnection(new SqlConnectionStringBuilder(sqlServerConnection) { InitialCatalog = "master", Pooling = false }.ConnectionString);
            admin.Open();
            using var command = new SqlCommand($"CREATE DATABASE [{isolatedDatabase}]", admin);
            command.ExecuteNonQuery();
            sqlServerDatabase = isolatedDatabase;
            connection = new SqlConnectionStringBuilder(sqlServerConnection) { InitialCatalog = sqlServerDatabase, Pooling = false }.ConnectionString;
        }
        else if (!string.IsNullOrWhiteSpace(mongoConnection))
        {
            provider = "MongoDb";
            mongoDatabase = "procoderji_test_" + Guid.NewGuid().ToString("N");
            connection = mongoConnection;
        }
        var settings = new Dictionary<string, string?>
        {
            ["PublicOrigin"] = publicOrigin,
            ["Database:Provider"] = provider,
            ["ConnectionStrings:Platform"] = connection,
            ["Database:Name"] = mongoDatabase,
            ["Authentication:Google:ClientId"] = googleConfigured ? "test-client.apps.googleusercontent.com" : "",
            ["Authentication:Google:ClientSecret"] = googleConfigured ? "test-only-not-a-real-secret" : "",
        };
        if (overrides is not null)
            foreach (var (key, value) in overrides) settings[key] = value;
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(settings));
        if (testAuthentication)
            builder.ConfigureTestServices(services => services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "Test";
                options.DefaultChallengeScheme = "Test";
            }).AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { }));
    }

    public HttpClient Browser(Guid? userId = null)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri(publicOrigin), AllowAutoRedirect = false, HandleCookies = true });
        if (userId is not null) client.DefaultRequestHeaders.Add("X-Test-User", userId.Value.ToString());
        return client;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;
        var completedSchema = schema;
        schema = null;
        if (completedSchema is not null && postgresConnection is not null)
        {
            using var connection = new NpgsqlConnection(postgresConnection);
            connection.Open();
            using var command = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{completedSchema}\" CASCADE", connection);
            command.ExecuteNonQuery();
        }
        var completedDatabase = sqlServerDatabase;
        sqlServerDatabase = null;
        if (completedDatabase is not null && sqlServerConnection is not null)
        {
            using var connection = new SqlConnection(new SqlConnectionStringBuilder(sqlServerConnection) { InitialCatalog = "master", Pooling = false }.ConnectionString);
            connection.Open();
            using var command = new SqlCommand($"ALTER DATABASE [{completedDatabase}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{completedDatabase}]", connection);
            command.ExecuteNonQuery();
        }
        var completedMongoDatabase = mongoDatabase;
        mongoDatabase = null;
        if (completedMongoDatabase is not null && mongoConnection is not null)
        {
            using var client = new MongoClient(mongoConnection);
            client.DropDatabase(completedMongoDatabase);
        }
        if (File.Exists(sqlitePath)) File.Delete(sqlitePath);
    }
}

// This handler exists only in the test assembly and is registered by the factory.
// The API has no test-header authentication path in any environment.
internal sealed class TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, IServiceProvider services)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Request.Headers["X-Test-User"], out var id)) return AuthenticateResult.NoResult();
        if (string.Equals(services.GetRequiredService<IConfiguration>()["Database:Provider"], "MongoDb", StringComparison.OrdinalIgnoreCase))
        {
            var database = services.GetRequiredService<MongoPlatformDatabase>();
            await database.Users.UpdateOneAsync(user => user.Id == id.ToString("D"),
                Builders<MongoUserDocument>.Update.SetOnInsert(user => user.GoogleSubject, "test-" + id)
                    .SetOnInsert(user => user.Email, $"{id:N}@example.test")
                    .SetOnInsert(user => user.Name, "Test student")
                    .SetOnInsert(user => user.CreatedAtUtc, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()),
                new UpdateOptions { IsUpsert = true }, Context.RequestAborted);
        }
        else
        {
            await using var db = await services.GetRequiredService<IDbContextFactory<PlatformDbContext>>().CreateDbContextAsync(Context.RequestAborted);
            if (!await db.Users.AnyAsync(user => user.Id == id, Context.RequestAborted))
            {
                db.Users.Add(new LearnerUser { Id = id, GoogleSubject = "test-" + id, Email = $"{id:N}@example.test", Name = "Test student", CreatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
                await db.SaveChangesAsync(Context.RequestAborted);
            }
        }
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString()), new Claim(ClaimTypes.Email, $"{id:N}@example.test"), new Claim(ClaimTypes.Name, "Test student")], Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}
