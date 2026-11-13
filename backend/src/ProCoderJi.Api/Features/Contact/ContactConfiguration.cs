using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using ProCoderJi.Api.Configuration;

namespace ProCoderJi.Api.Features.Contact;

public sealed class ContactConfiguration(IConfiguration configuration, PlatformConfiguration platform)
{
    public string SiteKey => configuration["Contact:TurnstileSiteKey"]?.Trim() ?? "";
    public string SecretKey => configuration["Contact:TurnstileSecretKey"]?.Trim() ?? "";
    private string ProxyKey => configuration["Contact:ProxyKey"] ?? "";
    public string Hostname => platform.PublicOrigin.Host;
    public bool Configured => SiteKey.Length > 0 && SecretKey.Length > 0 && ProxyKey.Length >= 32 &&
        !System.Text.RegularExpressions.Regex.IsMatch(SiteKey, "^[123]x0{20}[A-Z]{2}$") &&
        !System.Text.RegularExpressions.Regex.IsMatch(SecretKey, "^[123]x0{31}AA$");

    // Only the trusted BFF may supply a client address. Browser headers never select a limiter partition.
    public bool IsTrusted(HttpContext context)
    {
        var supplied = context.Request.Headers["X-Contact-Proxy-Key"].ToString();
        return Configured && supplied.Length == ProxyKey.Length && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(supplied), Encoding.UTF8.GetBytes(ProxyKey));
    }

    public string? ClientIp(HttpContext context) => IsTrusted(context) &&
        IPAddress.TryParse(context.Request.Headers["X-Contact-Client-IP"].ToString(), out var address)
            ? address.ToString() : null;
}

public static class ContactRegistration
{
    public const string RatePolicy = "contact-submit";
    public static IServiceCollection AddContactApi(this IServiceCollection services)
    {
        services.AddSingleton<ContactConfiguration>();
        services.AddHttpClient<ITurnstileVerifier, TurnstileVerifier>(client => client.Timeout = TimeSpan.FromSeconds(8));
        services.AddRateLimiter(options => options.AddPolicy(RatePolicy, context =>
        {
            var ip = context.RequestServices.GetRequiredService<ContactConfiguration>().ClientIp(context);
            return ip is null ? RateLimitPartition.GetNoLimiter("untrusted-contact") :
                RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5, Window = TimeSpan.FromMinutes(1), QueueLimit = 0,
                    AutoReplenishment = true
                });
        }));
        return services;
    }
}
