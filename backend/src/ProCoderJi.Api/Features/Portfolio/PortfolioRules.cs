using System.Text.Json;

namespace ProCoderJi.Api.Features.Portfolio;

/// <summary>
/// The portfolio rules shared with the frontend, read from <c>shared/portfolio/rules.json</c>
/// (copied to <c>Data/portfolio-rules.json</c> at build time).
/// </summary>
public sealed class PortfolioRules
{
    private static readonly JsonSerializerOptions RulesJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
    };

    public required IReadOnlyList<string> RequiredForPublish { get; init; }
    public required IReadOnlyList<string> Themes { get; init; }
    public required PublishingRules Publishing { get; init; }
    public required IReadOnlyDictionary<string, int> MaxItems { get; init; }
    public required IReadOnlyDictionary<string, int> MaxLength { get; init; }
    public required IReadOnlyList<string> MultilineFields { get; init; }
    public required TextRules Text { get; init; }
    public required LinkRules Link { get; init; }
    public required string EmailPattern { get; init; }
    public required UsernameRules Username { get; init; }

    public sealed record TextRules(string ControlCharacters, string HtmlLike);
    public sealed record PublishingRules(string PolicyVersion, int MinimumAge);

    public sealed record LinkRules(
        string Scheme,
        string ForbiddenCharacters,
        string HostPattern,
        IReadOnlyDictionary<string, string[]> HostRestrictions);

    public sealed record UsernameRules(
        int MinLength,
        int MaxLength,
        string Pattern,
        IReadOnlyList<string> Reserved,
        IReadOnlyList<string> BlockedWords);

    private sealed record RulesDocument(
        int Version,
        List<string>? Themes,
        PublishingRules? Publishing,
        List<string>? RequiredForPublish,
        Dictionary<string, int>? MaxItems,
        Dictionary<string, int>? MaxLength,
        List<string>? MultilineFields,
        TextRules? Text,
        LinkRules? Link,
        string? EmailPattern,
        UsernameRules? Username);

    public static PortfolioRules FromJson(string json)
    {
        RulesDocument? document;
        try { document = JsonSerializer.Deserialize<RulesDocument>(json, RulesJson); }
        catch (JsonException cause) { throw new InvalidDataException("The shared portfolio rules are not valid JSON.", cause); }
        if (document is not { Version: 2 } || document.Themes is not { Count: > 0 }
            || document.Publishing is not { MinimumAge: 18 } || !DateOnly.TryParseExact(document.Publishing.PolicyVersion, "yyyy-MM-dd", out _)
            || document.RequiredForPublish is null || document.MaxItems is null
            || document.MaxLength is null || document.MultilineFields is null || document.Text is null
            || document.Link is null || document.EmailPattern is null || document.Username is null
            || document.Username.Reserved is null || document.Username.BlockedWords is null
            || document.Link.HostRestrictions is null)
            throw new InvalidDataException("The shared portfolio rules are incomplete or use an unsupported version.");
        return new PortfolioRules
        {
            RequiredForPublish = document.RequiredForPublish,
            Themes = document.Themes,
            Publishing = document.Publishing,
            MaxItems = document.MaxItems,
            MaxLength = document.MaxLength,
            MultilineFields = document.MultilineFields,
            Text = document.Text,
            Link = document.Link,
            EmailPattern = document.EmailPattern,
            Username = document.Username
        };
    }

    /// <summary>Loads the rules copied next to the application.</summary>
    public static PortfolioRules LoadDefault() =>
        FromJson(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "portfolio-rules.json")));
}
