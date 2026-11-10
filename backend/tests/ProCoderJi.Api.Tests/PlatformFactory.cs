using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using ProCoderJi.Api.Data;

namespace ProCoderJi.Api.Tests;

public sealed class PlatformFactory(bool googleConfigured = false, string publicOrigin = "http://localhost:3000", bool testAuthentication = true) : WebApplicationFactory<Program>
{
    private readonly string sqlitePath = Path.Combine(Path.GetTempPath(), $"procoderji-{Guid.NewGuid():N}.db");
    private readonly string? postgresConnection = Environment.GetEnvironmentVariable("PROCODERJI_TEST_POSTGRES");
    private string? schema;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        var connection = $"Data Source={sqlitePath};Pooling=False";
        var provider = "Sqlite";
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
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PublicOrigin"] = publicOrigin,
            ["Database:Provider"] = provider,
            ["ConnectionStrings:Platform"] = connection,
            ["Authentication:Google:ClientId"] = googleConfigured ? "test-client.apps.googleusercontent.com" : "",
            ["Authentication:Google:ClientSecret"] = googleConfigured ? "test-only-not-a-real-secret" : "",
        }));
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
        if (File.Exists(sqlitePath)) File.Delete(sqlitePath);
    }
}

// This handler exists only in the test assembly and is registered by the factory.
// The API has no test-header authentication path in any environment.
internal sealed class TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, IDbContextFactory<PlatformDbContext> factory)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Request.Headers["X-Test-User"], out var id)) return AuthenticateResult.NoResult();
        await using var db = await factory.CreateDbContextAsync(Context.RequestAborted);
        if (!await db.Users.AnyAsync(user => user.Id == id, Context.RequestAborted))
        {
            db.Users.Add(new LearnerUser { Id = id, GoogleSubject = "test-" + id, Email = $"{id:N}@example.test", Name = "Test student", CreatedAtUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
            await db.SaveChangesAsync(Context.RequestAborted);
        }
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString()), new Claim(ClaimTypes.Email, $"{id:N}@example.test"), new Claim(ClaimTypes.Name, "Test student")], Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}
