using System.Globalization;
using System.Threading.RateLimiting;
using ProCoderJi.Api.Infrastructure;

namespace ProCoderJi.Api.Features.Portfolio;

public static class PortfolioApiConfiguration
{
    public const string WritePolicy = "portfolio-write";
    public const string UsernamePolicy = "portfolio-username";

    public static IServiceCollection AddPortfolioApi(this IServiceCollection services)
    {
        services.AddSingleton(_ => PortfolioValidator.CreateDefault());
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(WritePolicy, context => Partition(context, 10));
            options.AddPolicy(UsernamePolicy, context => Partition(context, 30));
            options.OnRejected = async (context, cancellationToken) =>
            {
                var seconds = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter)
                    ? Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)) : 60;
                context.HttpContext.Response.Headers.RetryAfter = seconds.ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(new
                {
                    code = "rate-limited",
                    error = context.HttpContext.Request.Path.StartsWithSegments("/api/platform/contact")
                        ? "Too many messages. Wait a minute before trying again."
                        : "Too many portfolio requests. Wait before trying again."
                }, cancellationToken);
            };
        });
        return services;
    }

    private static RateLimitPartition<string> Partition(HttpContext context, int permits)
    {
        var id = ApiSecurity.UserId(context);
        // Unauthenticated requests reach the endpoint's 401 response. Never partition on
        // browser-supplied IDs: one authenticated learner cannot spend another's allowance.
        if (id is null) return RateLimitPartition.GetNoLimiter("anonymous");
        return RateLimitPartition.GetFixedWindowLimiter(id.Value.ToString("D"), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        });
    }
}
