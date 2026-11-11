using System.Collections.Concurrent;
using System.Net;
using System.Runtime.Loader;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Features.Portfolio;
using ProCoderJi.Api.Tests;

namespace ProCoderJi.BrowserHost;

/// <summary>Loopback-only browser fixtures. This executable is never part of the API publish/image.</summary>
internal static class BrowserProgram
{
    public static async Task<int> Main(string[] args)
    {
        using var stopping = new CancellationTokenSource();
        void Cancel(object? sender, ConsoleCancelEventArgs signal) { signal.Cancel = true; stopping.Cancel(); }
        void Unload(AssemblyLoadContext context) => stopping.Cancel();
        Console.CancelKeyPress += Cancel;
        AssemblyLoadContext.Default.Unloading += Unload;
        try
        {
            var options = BrowserOptions.Parse(args);
            var settings = new Dictionary<string, string?>
            {
                ["Portfolio:PublishingEnabled"] = "true",
                ["Logging:LogLevel:Default"] = "Warning",
            };
            if (options.DataDirectory is not null)
                settings["ConnectionStrings:Platform"] = new SqliteConnectionStringBuilder
                {
                    DataSource = Path.Combine(options.DataDirectory, "platform.db"), Pooling = false,
                }.ConnectionString;

            using var factory = new PlatformFactory(googleConfigured: true, publicOrigin: options.PublicOrigin,
                testAuthentication: false, overrides: settings);
            var state = new BrowserFixtureState();
            using var host = factory.WithWebHostBuilder(builder =>
            {
                builder.UseContentRoot(options.ApiRoot);
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton(state);
                    services.AddSingleton<IStartupFilter, BrowserFixtureStartupFilter>();
                    services.AddAuthentication(authentication =>
                    {
                        authentication.DefaultAuthenticateScheme = BrowserCookieAuthentication.SchemeName;
                        authentication.DefaultChallengeScheme = BrowserCookieAuthentication.SchemeName;
                    }).AddScheme<AuthenticationSchemeOptions, BrowserCookieAuthentication>(BrowserCookieAuthentication.SchemeName, _ => { });
                });
            });
            host.UseKestrel(server => server.Listen(IPAddress.Loopback, options.Port));
            host.StartServer();
            using var registration = host.Services.GetRequiredService<IHostApplicationLifetime>()
                .ApplicationStopping.Register(stopping.Cancel);
            Console.WriteLine($"TEST-ONLY browser fixture ready at http://127.0.0.1:{options.Port}.");
            try { await Task.Delay(Timeout.InfiniteTimeSpan, stopping.Token); }
            catch (OperationCanceledException) when (stopping.IsCancellationRequested) { }
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error);
            return 1;
        }
        finally
        {
            Console.CancelKeyPress -= Cancel;
            AssemblyLoadContext.Default.Unloading -= Unload;
        }
    }
}

internal sealed record BrowserOptions(int Port, string PublicOrigin, string ApiRoot, string? DataDirectory)
{
    public static BrowserOptions Parse(string[] args)
    {
        var port = 5151;
        string? dataDirectory = null;
        if (args.Length % 2 != 0) throw new ArgumentException("Use --port <port> or --urls <loopback-url>, and optional --data-directory <fixture-directory>.");
        for (var index = 0; index < args.Length; index += 2)
        {
            var value = args[index + 1];
            switch (args[index])
            {
                case "--port":
                    if (!int.TryParse(value, out port) || port is < 1 or > 65535)
                        throw new ArgumentException("The browser-fixture port must be between 1 and 65535.");
                    break;
                case "--urls":
                    var address = LoopbackOrigin(value);
                    if (address.Host is not ("localhost" or "127.0.0.1"))
                        throw new ArgumentException("The fixture URL must use localhost or 127.0.0.1.");
                    port = address.Port;
                    break;
                case "--data-directory":
                    dataDirectory = FixtureDirectory(value);
                    break;
                default:
                    throw new ArgumentException("Unknown browser-fixture option.");
            }
        }
        foreach (var name in new[] { "PROCODERJI_TEST_POSTGRES", "PROCODERJI_TEST_SQLSERVER", "PROCODERJI_TEST_MONGODB" })
            if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(name)))
                throw new InvalidOperationException("Browser fixtures use disposable SQLite only; unset external database test connections.");
        var publicOrigin = LoopbackOrigin(Environment.GetEnvironmentVariable("PublicOrigin") ?? "http://localhost:3150");
        if (publicOrigin.Port == port) throw new ArgumentException("Frontend and browser-fixture ports must differ.");
        return new BrowserOptions(port, publicOrigin.GetLeftPart(UriPartial.Authority), FindApiRoot(), dataDirectory);
    }

    private static Uri LoopbackOrigin(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var address) || address.Scheme != "http" || !address.IsLoopback
            || address.UserInfo.Length != 0 || address.AbsolutePath != "/" || address.Query.Length != 0 || address.Fragment.Length != 0)
            throw new ArgumentException("Browser fixtures require an HTTP loopback origin without credentials or a path.");
        return address;
    }

    private static string FixtureDirectory(string value)
    {
        var path = Path.GetFullPath(value).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var temporaryRoot = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
        if (!string.Equals(Path.GetDirectoryName(path), temporaryRoot, comparison)
            || !Path.GetFileName(path).StartsWith("procoderji-e2e-", StringComparison.Ordinal)
            || !Directory.Exists(path) || (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
            throw new ArgumentException("The data directory must be an existing procoderji-e2e-* directory immediately under the OS temporary directory.");
        return path;
    }

    private static string FindApiRoot()
    {
        for (var directory = new DirectoryInfo(AppContext.BaseDirectory); directory is not null; directory = directory.Parent)
        {
            var candidate = Path.Combine(directory.FullName, "backend", "src", "ProCoderJi.Api");
            if (File.Exists(Path.Combine(candidate, "ProCoderJi.Api.csproj"))) return candidate;
        }
        throw new DirectoryNotFoundException("Run the browser host from this repository's build output.");
    }
}

internal sealed class BrowserFixtureState
{
    public const string CookieName = "procoderji.e2e-user";
    public ConcurrentDictionary<Guid, LearnerUser> Accounts { get; } = new();
}

internal sealed class BrowserCookieAuthentication(IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger, UrlEncoder encoder, BrowserFixtureState fixtures)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "BrowserFixtureCookie";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Guid.TryParse(Request.Cookies[BrowserFixtureState.CookieName], out var id)
            || !fixtures.Accounts.TryGetValue(id, out var account)
            || !await Context.RequestServices.GetRequiredService<IAccountStore>().Exists(id, Context.RequestAborted))
            return AuthenticateResult.NoResult();
        var identity = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString("D")),
            new Claim(ClaimTypes.Email, account.Email),
            new Claim(ClaimTypes.Name, account.Name),
        ], Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}

internal sealed class BrowserFixtureStartupFilter(BrowserFixtureState fixtures) : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        app.Use(async (HttpContext context, RequestDelegate nextMiddleware) =>
        {
            if (context.Connection.RemoteIpAddress is not { } remote || !IPAddress.IsLoopback(remote))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
            if (context.Request.Path.StartsWithSegments("/__e2e__", out var remaining))
            {
                await FixtureRequest(context, remaining);
                return;
            }
            if (context.Request.Path == "/api/platform/auth/logout")
                context.Response.OnStarting(() =>
                {
                    if (context.Response.StatusCode == StatusCodes.Status204NoContent)
                        context.Response.Cookies.Delete(BrowserFixtureState.CookieName, new CookieOptions { Path = "/api/platform" });
                    return Task.CompletedTask;
                });
            await nextMiddleware(context);
        });
        next(app);
    };

    private async Task FixtureRequest(HttpContext context, PathString path)
    {
        context.Response.Headers.CacheControl = "no-store";
        if (!HttpMethods.IsPost(context.Request.Method))
        {
            context.Response.StatusCode = StatusCodes.Status405MethodNotAllowed;
            return;
        }
        if (path == "/account")
        {
            var token = Guid.NewGuid().ToString("N");
            var account = await context.RequestServices.GetRequiredService<IAccountStore>()
                .SignIn($"browser-{token}", $"{token}@example.test", "Browser student", context.RequestAborted);
            fixtures.Accounts[account.Id] = account;
            await context.Response.WriteAsJsonAsync(new { id = account.Id.ToString("D"), email = account.Email, name = account.Name });
            return;
        }
        var segments = path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries) ?? [];
        if (segments is ["publishing", var enabled] && bool.TryParse(enabled, out var publishing))
        {
            context.RequestServices.GetRequiredService<IConfiguration>()["Portfolio:PublishingEnabled"] = publishing.ToString();
            await context.Response.WriteAsJsonAsync(new { publishingEnabled = publishing });
            return;
        }
        if (segments is ["moderate", var username, var action] && action is "suspend" or "restore")
        {
            using var output = new StringWriter();
            using var error = new StringWriter();
            var code = await PortfolioModerationCommand.TryRun(["--portfolio", action, "--username", username],
                context.RequestServices, context.RequestAborted, output, error);
            if (code == 0)
            {
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(output.ToString());
            }
            else
            {
                context.Response.StatusCode = code == 3 ? StatusCodes.Status404NotFound : StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { error = error.ToString().Trim() });
            }
            return;
        }
        context.Response.StatusCode = StatusCodes.Status404NotFound;
    }
}
