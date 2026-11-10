using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace ProCoderJi.Api.Features.Portfolio;

public enum PortfolioMode { Draft, Publish }

/// <summary>A problem at a field path such as <c>projects[0].link</c>.</summary>
public readonly record struct PortfolioProblem(string Path, string Code)
{
    /// <summary>The stable <c>path:code</c> form used by the shared fixtures.</summary>
    public override string ToString() => $"{Path}:{Code}";
}

/// <summary>
/// Trusted portfolio validation. The frontend implements the same rules in
/// <c>src/features/portfolio/validation.ts</c>, and both run against
/// <c>shared/portfolio/fixtures.json</c>. Keep the two in step: when a check changes, add a
/// fixture first. The rules avoid URI parsers and culture-aware string functions on purpose,
/// because those behave differently in .NET and JavaScript.
/// </summary>
public sealed class PortfolioValidator
{
    private static readonly string[] TopLevelFields =
        ["name", "headline", "about", "skills", "projects", "education", "experience", "achievements", "links"];

    private readonly PortfolioRules rules;
    private readonly Regex control;
    private readonly Regex htmlLike;
    private readonly Regex linkForbidden;
    private readonly Regex host;
    private readonly Regex email;
    private readonly Regex username;
    private readonly HashSet<string> reserved;
    private readonly HashSet<string> multiline;

    public PortfolioValidator(PortfolioRules rules)
    {
        this.rules = rules;
        control = Pattern(rules.Text.ControlCharacters);
        htmlLike = Pattern(rules.Text.HtmlLike);
        linkForbidden = Pattern(rules.Link.ForbiddenCharacters);
        host = Anchored(rules.Link.HostPattern);
        email = Anchored(rules.EmailPattern);
        username = Anchored(rules.Username.Pattern);
        reserved = new HashSet<string>(rules.Username.Reserved, StringComparer.Ordinal);
        multiline = new HashSet<string>(rules.MultilineFields, StringComparer.Ordinal);
    }

    public static PortfolioValidator CreateDefault() => new(PortfolioRules.LoadDefault());

    // .NET's "$" also matches before a final newline; "\z" does not, so "riya\n" cannot slip through.
    private static Regex Anchored(string pattern) => new(pattern + "\\z", RegexOptions.CultureInvariant);
    private static Regex Pattern(string pattern) => new(pattern, RegexOptions.CultureInvariant);

    public IReadOnlyList<PortfolioProblem> ValidateUsername(string value) =>
        ValidateUsername(JsonValue.Create(value));

    /// <summary>Checks a username for the public address <c>/u/&lt;username&gt;</c>.</summary>
    public IReadOnlyList<PortfolioProblem> ValidateUsername(JsonNode? node)
    {
        const string path = "username";
        var rule = rules.Username;
        if (!TryString(node, out var value)) return [new(path, "invalid-type")];
        if (IsBlank(value)) return [new(path, "required")];
        if (value.Length < rule.MinLength) return [new(path, "too-short")];
        if (value.Length > rule.MaxLength) return [new(path, "too-long")];
        if (!username.IsMatch(value)) return [new(path, "invalid-format")];
        if (reserved.Contains(value)) return [new(path, "reserved")];
        var squashed = value.Replace("-", "", StringComparison.Ordinal);
        if (rule.BlockedWords.Any(word => squashed.Contains(word, StringComparison.Ordinal)))
            return [new(path, "blocked-word")];
        return [];
    }

    /// <summary>
    /// Checks untrusted portfolio data. A draft only has to be well-formed; publishing also needs
    /// the fields listed in <c>requiredForPublish</c>. An empty result means the data is valid.
    /// </summary>
    public IReadOnlyList<PortfolioProblem> Validate(JsonNode? node, PortfolioMode mode)
    {
        var problems = new List<PortfolioProblem>();
        if (node is not JsonObject root) return [new("$", "invalid-type")];
        CheckUnknownFields(problems, "", root, TopLevelFields);

        bool RequiredOnPublish(string key) => mode == PortfolioMode.Publish && rules.RequiredForPublish.Contains(key);
        CheckText(problems, "name", Get(root, "name"), "name", RequiredOnPublish("name"));
        CheckText(problems, "headline", Get(root, "headline"), "headline", RequiredOnPublish("headline"));
        CheckText(problems, "about", Get(root, "about"), "about", false);

        CheckList(problems, "skills", Get(root, "skills"), "skills", (path, item) =>
            CheckText(problems, path, new(true, item), "skills.item", true));

        CheckList(problems, "projects", Get(root, "projects"), "projects", (path, item) =>
            CheckObjectItem(problems, path, item, ["title", "link", "technologies", "description"], project =>
            {
                CheckText(problems, $"{path}.title", Get(project, "title"), "projects.title", true);
                CheckLink(problems, $"{path}.link", Get(project, "link"), null);
                CheckList(problems, $"{path}.technologies", Get(project, "technologies"), "projects.technologies", (techPath, tech) =>
                    CheckText(problems, techPath, new(true, tech), "projects.technologies.item", true));
                CheckText(problems, $"{path}.description", Get(project, "description"), "projects.description", false);
            }));

        CheckList(problems, "education", Get(root, "education"), "education", (path, item) =>
            CheckObjectItem(problems, path, item, ["institution", "degree", "period", "details"], entry =>
            {
                CheckText(problems, $"{path}.institution", Get(entry, "institution"), "education.institution", true);
                CheckText(problems, $"{path}.degree", Get(entry, "degree"), "education.degree", false);
                CheckText(problems, $"{path}.period", Get(entry, "period"), "education.period", false);
                CheckText(problems, $"{path}.details", Get(entry, "details"), "education.details", false);
            }));

        CheckList(problems, "experience", Get(root, "experience"), "experience", (path, item) =>
            CheckObjectItem(problems, path, item, ["organization", "role", "period", "description"], entry =>
            {
                CheckText(problems, $"{path}.organization", Get(entry, "organization"), "experience.organization", true);
                CheckText(problems, $"{path}.role", Get(entry, "role"), "experience.role", true);
                CheckText(problems, $"{path}.period", Get(entry, "period"), "experience.period", false);
                CheckText(problems, $"{path}.description", Get(entry, "description"), "experience.description", false);
            }));

        CheckList(problems, "achievements", Get(root, "achievements"), "achievements", (path, item) =>
            CheckText(problems, path, new(true, item), "achievements.item", true));

        var links = Get(root, "links");
        if (links.Present)
        {
            if (links.Node is not JsonObject linkObject) problems.Add(new("links", "invalid-type"));
            else
            {
                CheckUnknownFields(problems, "links", linkObject, ["github", "linkedin", "website", "email"]);
                CheckLink(problems, "links.github", Get(linkObject, "github"), "links.github");
                CheckLink(problems, "links.linkedin", Get(linkObject, "linkedin"), "links.linkedin");
                CheckLink(problems, "links.website", Get(linkObject, "website"), null);
                CheckEmail(problems, "links.email", Get(linkObject, "email"));
            }
        }
        return problems;
    }

    private readonly record struct Field(bool Present, JsonNode? Node);

    private static Field Get(JsonObject source, string key) =>
        source.TryGetPropertyValue(key, out var node) ? new(true, node) : new(false, null);

    private static bool TryString(JsonNode? node, out string value)
    {
        if (node is JsonValue json && json.TryGetValue<string>(out var text) && text is not null)
        {
            value = text;
            return true;
        }
        value = "";
        return false;
    }

    private static bool IsBlank(string value) => value.All(c => c is ' ' or '\t' or '\r' or '\n');

    /// <summary>Lower-cases A-Z only, so other characters such as the Kelvin sign are never folded.</summary>
    private static string AsciiLower(string value) =>
        string.Create(value.Length, value, static (span, source) =>
        {
            for (var i = 0; i < source.Length; i++)
                span[i] = source[i] is >= 'A' and <= 'Z' ? (char)(source[i] + 32) : source[i];
        });

    private int Limit(IReadOnlyDictionary<string, int> table, string key) =>
        table.TryGetValue(key, out var value) ? value : throw new InvalidDataException($"Missing portfolio rule: {key}");

    private static void CheckUnknownFields(List<PortfolioProblem> problems, string path, JsonObject source, IReadOnlyCollection<string> allowed)
    {
        foreach (var (key, _) in source)
            if (!allowed.Contains(key)) problems.Add(new(path.Length == 0 ? key : $"{path}.{key}", "unknown-field"));
    }

    private void CheckText(List<PortfolioProblem> problems, string path, Field field, string key, bool required)
    {
        if (!field.Present)
        {
            if (required) problems.Add(new(path, "required"));
            return;
        }
        if (!TryString(field.Node, out var value)) { problems.Add(new(path, "invalid-type")); return; }
        if (IsBlank(value))
        {
            if (required) problems.Add(new(path, "required"));
            return;
        }
        if (value.Length > Limit(rules.MaxLength, key)) { problems.Add(new(path, "too-long")); return; }
        if (control.IsMatch(value) || (!multiline.Contains(key) && value.AsSpan().IndexOfAny('\r', '\n') >= 0))
        {
            problems.Add(new(path, "invalid-characters"));
            return;
        }
        if (htmlLike.IsMatch(value)) problems.Add(new(path, "html-like"));
    }

    /// <summary>An optional https link. <paramref name="hostKey"/> selects the host restriction, such as <c>links.github</c>.</summary>
    private void CheckLink(List<PortfolioProblem> problems, string path, Field field, string? hostKey)
    {
        if (!field.Present) return;
        if (!TryString(field.Node, out var value)) { problems.Add(new(path, "invalid-type")); return; }
        if (IsBlank(value)) return;
        if (value.Length > Limit(rules.MaxLength, "link")) { problems.Add(new(path, "too-long")); return; }
        var scheme = rules.Link.Scheme;
        if (linkForbidden.IsMatch(value) || value.Length < scheme.Length || AsciiLower(value[..scheme.Length]) != scheme)
        {
            problems.Add(new(path, "invalid-link"));
            return;
        }
        var rest = value[scheme.Length..];
        var end = rest.AsSpan().IndexOfAny('/', '?', '#');
        var authority = end < 0 ? rest : rest[..end];
        // The host pattern allows only letters, digits, hyphens and dots, so credentials
        // (user@host), ports (host:8443), IP literals and empty hosts all fail it.
        var hostName = AsciiLower(authority);
        if (!host.IsMatch(hostName)) { problems.Add(new(path, "invalid-link")); return; }
        if (hostKey is not null && rules.Link.HostRestrictions.TryGetValue(hostKey, out var allowed)
            && !allowed.Any(domain => hostName == domain || hostName.EndsWith("." + domain, StringComparison.Ordinal)))
            problems.Add(new(path, "invalid-host"));
    }

    private void CheckEmail(List<PortfolioProblem> problems, string path, Field field)
    {
        if (!field.Present) return;
        if (!TryString(field.Node, out var value)) { problems.Add(new(path, "invalid-type")); return; }
        if (IsBlank(value)) return;
        if (value.Length > Limit(rules.MaxLength, "email")) { problems.Add(new(path, "too-long")); return; }
        if (!email.IsMatch(value)) problems.Add(new(path, "invalid-email"));
    }

    private void CheckList(List<PortfolioProblem> problems, string path, Field field, string key, Action<string, JsonNode?> checkItem)
    {
        if (!field.Present) return;
        if (field.Node is not JsonArray array) { problems.Add(new(path, "invalid-type")); return; }
        if (array.Count > Limit(rules.MaxItems, key)) { problems.Add(new(path, "too-many")); return; }
        for (var i = 0; i < array.Count; i++) checkItem($"{path}[{i}]", array[i]);
    }

    private static void CheckObjectItem(List<PortfolioProblem> problems, string path, JsonNode? item, string[] allowed, Action<JsonObject> checkFields)
    {
        if (item is not JsonObject source) { problems.Add(new(path, "invalid-type")); return; }
        CheckUnknownFields(problems, path, source, allowed);
        checkFields(source);
    }
}
