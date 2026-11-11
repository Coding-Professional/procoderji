using System.Security.Cryptography;
using System.Text;

namespace ProCoderJi.Api.Features.Portfolio;

/// <summary>Phase 1 publishing decisions recorded in ADR 0002; no birth date is collected.</summary>
public static class PortfolioPublishingPolicy
{
    private static readonly Lazy<PortfolioRules.PublishingRules> Rules = new(() => PortfolioRules.LoadDefault().Publishing);
    public static string Version => Rules.Value.PolicyVersion;
    public static int MinimumAge => Rules.Value.MinimumAge;

    public static bool IsAccepted(PortfolioRecord record) =>
        record.PublishingPolicyVersion == Version && record.EligibilityConfirmedAtUtc is not null && record.PublishedAtUtc is not null;

    // A public snapshot identity never uses the owner's private editing revision.
    public static string PublicVersion(PortfolioRecord record) => Convert.ToHexStringLower(SHA256.HashData(
        Encoding.UTF8.GetBytes($"{record.PublishedAtUtc}:{record.PublishedSearchVisible}:{record.PublishedJson}")));
}
