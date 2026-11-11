using System.Security.Claims;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.EntityFrameworkCore;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Data;
using ProCoderJi.Api.Data.Mongo;
using ProCoderJi.Api.Features.Accounts;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Features.Progress;
using ProCoderJi.Api.Features.Portfolio;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton(services => PlatformConfiguration.From(services.GetRequiredService<IConfiguration>(), services.GetRequiredService<IHostEnvironment>()));
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 256 * 1024);

// Resolve the selected provider from DI after configuration is complete. Only the selected
// adapter connects; account and progress endpoints do not depend on a database technology.
builder.Services.AddRelationalDatabase();
builder.Services.AddMongoDatabase();
builder.Services.AddScoped<RelationalAccountStore>();
builder.Services.AddScoped<ProgressService>();
builder.Services.AddScoped<RelationalPortfolioStore>();
builder.Services.AddScoped<IAccountStore>(services => IsMongo(services.GetRequiredService<IConfiguration>())
    ? services.GetRequiredService<MongoAccountStore>() : services.GetRequiredService<RelationalAccountStore>());
builder.Services.AddScoped<IProgressStore>(services => IsMongo(services.GetRequiredService<IConfiguration>())
    ? services.GetRequiredService<MongoProgressStore>() : services.GetRequiredService<ProgressService>());
builder.Services.AddScoped<IPortfolioStore>(services => IsMongo(services.GetRequiredService<IConfiguration>())
    ? services.GetRequiredService<MongoPortfolioStore>() : services.GetRequiredService<RelationalPortfolioStore>());
builder.Services.AddPortfolioApi();
builder.Services.AddDataProtection().SetApplicationName("ProCoderJi.Platform");
builder.Services.AddOptions<KeyManagementOptions>().Configure<IServiceProvider>((options, services) =>
    options.XmlRepository = IsMongo(services.GetRequiredService<IConfiguration>())
        ? services.GetRequiredService<MongoXmlRepository>()
        : new EntityFrameworkCoreXmlRepository<PlatformDbContext>(services, services.GetRequiredService<ILoggerFactory>()));
builder.Services.AddSingleton<PracticeQuestionBank>();

var authentication = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = PlatformConfiguration.CookieScheme;
    options.DefaultSignInScheme = PlatformConfiguration.CookieScheme;
    options.DefaultChallengeScheme = PlatformConfiguration.CookieScheme;
}).AddCookie(PlatformConfiguration.CookieScheme, options =>
{
    var platform = PlatformConfiguration.From(builder.Configuration, builder.Environment);
    options.Cookie.Name = "procoderji.session";
    options.Cookie.Path = "/api/platform";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = platform.PublicOrigin.Scheme == "https" ? CookieSecurePolicy.Always : CookieSecurePolicy.None;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
    options.Events = new CookieAuthenticationEvents
    {
        OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; },
        OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; },
        OnValidatePrincipal = async context =>
        {
            if (!Guid.TryParse(context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) { context.RejectPrincipal(); return; }
            var accounts = context.HttpContext.RequestServices.GetRequiredService<IAccountStore>();
            if (!await accounts.Exists(id, context.HttpContext.RequestAborted)) context.RejectPrincipal();
        },
    };
});
authentication.AddGoogle(PlatformConfiguration.GoogleScheme, options =>
    {
        var platform = PlatformConfiguration.From(builder.Configuration, builder.Environment);
        // The challenge endpoint returns 503 when absent. Nonempty placeholders
        // let middleware initialize without requiring credentials for guest use.
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"] is { Length: > 0 } id ? id : "disabled";
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"] is { Length: > 0 } secret ? secret : "disabled";
        options.CallbackPath = "/api/platform/signin-google";
        options.SignInScheme = PlatformConfiguration.CookieScheme;
        options.SaveTokens = false;
        options.CorrelationCookie.Path = "/api/platform";
        options.CorrelationCookie.HttpOnly = true;
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = platform.PublicOrigin.Scheme == "https" ? CookieSecurePolicy.Always : CookieSecurePolicy.None;
        options.Events.OnTicketReceived = GoogleAccountEvents.CompleteTicket;
        options.Events.OnRemoteFailure = context =>
        {
            context.Response.Redirect(new Uri(platform.PublicOrigin, "/account?error=auth").AbsoluteUri);
            context.HandleResponse();
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddAntiforgery(options =>
{
    var platform = PlatformConfiguration.From(builder.Configuration, builder.Environment);
    options.HeaderName = "X-CSRF-Token";
    options.Cookie.Name = "procoderji.antiforgery";
    options.Cookie.Path = "/api/platform";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = platform.PublicOrigin.Scheme == "https" ? CookieSecurePolicy.Always : CookieSecurePolicy.None;
});

var app = builder.Build();
var platform = app.Services.GetRequiredService<PlatformConfiguration>();
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing") || builder.Configuration.GetValue<bool>("Database:MigrateOnStartup") || args.Contains("--migrate"))
{
    await using var scope = app.Services.CreateAsyncScope();
    if (IsMongo(app.Configuration))
        await scope.ServiceProvider.GetRequiredService<MongoPlatformDatabase>().InitializeAsync();
    else
        await scope.ServiceProvider.GetRequiredService<PlatformDbContext>().Database.MigrateAsync();
}
if (args.Contains("--migrate")) return;

app.UseExceptionHandler(handler => handler.Run(async context =>
{
    context.Response.StatusCode = 503;
    await context.Response.WriteAsJsonAsync(new { error = "The learning account service is temporarily unavailable. Your browser practice remains available." });
}));
app.Use(async (context, next) =>
{
    // A configured canonical origin is trusted, never arbitrary forwarded headers.
    // OAuth cookies and redirect_uri therefore refer to the frontend BFF origin.
    context.Request.Scheme = platform.PublicOrigin.Scheme;
    context.Request.Host = new HostString(platform.PublicOrigin.Authority);
    context.Response.Headers.CacheControl = "private, no-store";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.UseAntiforgery();
app.MapAccountEndpoints();
app.MapProgressEndpoints();
app.MapPortfolioEndpoints();
app.MapGet("/api/platform/health", () => Results.Json(new { status = "ok" }));
app.Run();

static bool IsMongo(IConfiguration configuration) =>
    string.Equals(configuration["Database:Provider"], "MongoDb", StringComparison.OrdinalIgnoreCase);

public partial class Program { }
