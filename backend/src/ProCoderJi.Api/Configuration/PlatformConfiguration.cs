namespace ProCoderJi.Api.Configuration;

public sealed record PlatformConfiguration(Uri PublicOrigin, bool GoogleConfigured)
{
    public const string CookieScheme = "PlatformCookie";
    public const string GoogleScheme = "Google";

    public static PlatformConfiguration From(IConfiguration configuration, IHostEnvironment environment)
    {
        var value = configuration["PublicOrigin"] ?? (environment.IsDevelopment() || environment.IsEnvironment("Testing") ? "http://localhost:3000" : null);
        if (!Uri.TryCreate(value, UriKind.Absolute, out var origin) || origin.UserInfo.Length > 0 || origin.AbsolutePath != "/" || origin.Query.Length > 0 || origin.Fragment.Length > 0 ||
            (origin.Scheme != "https" && !(origin.Scheme == "http" && origin.IsLoopback && (environment.IsDevelopment() || environment.IsEnvironment("Testing")))))
            throw new InvalidOperationException("PublicOrigin must be the HTTPS frontend origin, or a loopback HTTP origin for development.");
        var configured = !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"]) && !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);
        return new PlatformConfiguration(origin, configured);
    }

    public string ReturnUrl(string? value)
    {
        var path = "/learn";
        if (value is not null && value.StartsWith('/') && !value.StartsWith("//") && !value.Contains('\\') && !value.Any(char.IsControl) && Uri.TryCreate(PublicOrigin, value, out var destination) && destination.GetLeftPart(UriPartial.Authority) == PublicOrigin.GetLeftPart(UriPartial.Authority) &&
            new[] { "/learn", "/practice", "/account" }.Any(root => destination.AbsolutePath == root || destination.AbsolutePath.StartsWith(root + "/", StringComparison.Ordinal)))
            path = destination.PathAndQuery;
        return new Uri(PublicOrigin, path).AbsoluteUri;
    }
}
