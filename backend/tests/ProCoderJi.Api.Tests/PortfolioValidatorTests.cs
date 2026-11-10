using System.Text.Json;
using System.Text.Json.Nodes;
using ProCoderJi.Api.Features.Portfolio;
using Xunit;

namespace ProCoderJi.Api.Tests;

/// <summary>
/// Runs the shared fixtures that the frontend also runs (<c>src/features/portfolio/portfolio.test.ts</c>).
/// Add a fixture to <c>shared/portfolio/fixtures.json</c> first when a rule changes.
/// </summary>
public sealed class PortfolioValidatorTests
{
    private static readonly PortfolioValidator Validator = PortfolioValidator.CreateDefault();

    private static JsonNode Fixtures => JsonNode.Parse(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "portfolio-fixtures.json")))!;

    private static string[] Sorted(IEnumerable<PortfolioProblem> problems) =>
        problems.Select(problem => problem.ToString()).Order(StringComparer.Ordinal).ToArray();

    private static string[] Expected(JsonNode fixture) =>
        fixture["problems"]!.AsArray().Select(problem => problem!.GetValue<string>()).Order(StringComparer.Ordinal).ToArray();

    [Fact]
    public void EverySharedUsernameFixtureGivesTheExpectedProblems()
    {
        var cases = Fixtures["usernames"]!.AsArray();
        Assert.NotEmpty(cases);
        foreach (var fixture in cases)
            Assert.True(
                Expected(fixture!).SequenceEqual(Sorted(Validator.ValidateUsername(fixture!["value"]))),
                $"{fixture["name"]}: expected [{string.Join(", ", Expected(fixture))}] but got [{string.Join(", ", Sorted(Validator.ValidateUsername(fixture["value"])))}]");
    }

    [Fact]
    public void EverySharedPortfolioFixtureGivesTheExpectedProblems()
    {
        var cases = Fixtures["portfolios"]!.AsArray();
        Assert.NotEmpty(cases);
        foreach (var fixture in cases)
        {
            var mode = fixture!["mode"]!.GetValue<string>() switch
            {
                "draft" => PortfolioMode.Draft,
                "publish" => PortfolioMode.Publish,
                var other => throw new InvalidDataException($"Unknown fixture mode: {other}")
            };
            var actual = Sorted(Validator.Validate(fixture["value"], mode));
            Assert.True(
                Expected(fixture).SequenceEqual(actual),
                $"{fixture["name"]}: expected [{string.Join(", ", Expected(fixture))}] but got [{string.Join(", ", actual)}]");
        }
    }

    // Text with a lone surrogate cannot be stored in JSON that System.Text.Json parses, so these
    // fixtures list the UTF-16 code units and each runtime builds the string itself.
    [Fact]
    public void EveryMalformedTextFixtureGivesTheExpectedProblems()
    {
        var cases = Fixtures["malformedText"]!.AsArray();
        Assert.NotEmpty(cases);
        foreach (var fixture in cases)
        {
            var text = new string(fixture!["codeUnits"]!.AsArray().Select(unit => (char)unit!.GetValue<int>()).ToArray());
            var field = fixture["field"]!.GetValue<string>();
            var actual = Sorted(field == "username"
                ? Validator.ValidateUsername(text)
                : Validator.Validate(PortfolioWith(field, text), PortfolioMode.Draft));
            Assert.True(
                Expected(fixture).SequenceEqual(actual),
                $"{fixture["name"]}: expected [{string.Join(", ", Expected(fixture))}] but got [{string.Join(", ", actual)}]");
        }
    }

    private static JsonNode PortfolioWith(string field, string text) => field switch
    {
        "name" => new JsonObject { ["name"] = text },
        "about" => new JsonObject { ["about"] = text },
        "skill" => new JsonObject { ["skills"] = new JsonArray(text) },
        "projectLink" => new JsonObject { ["projects"] = new JsonArray(new JsonObject { ["title"] = "App", ["link"] = text }) },
        "website" => new JsonObject { ["links"] = new JsonObject { ["website"] = text } },
        "email" => new JsonObject { ["links"] = new JsonObject { ["email"] = text } },
        "key" => new JsonObject { [text] = 1 },
        "linksKey" => new JsonObject { ["links"] = new JsonObject { [text] = 1 } },
        "projectKey" => new JsonObject { ["projects"] = new JsonArray(new JsonObject { ["title"] = "App", [text] = 1 }) },
        _ => throw new InvalidDataException($"Unknown fixture field: {field}")
    };

    [Fact]
    public void ALoneSurrogateEscapeInParsedJsonIsAProblemNotAnException()
    {
        // JsonNode.Parse accepts the text; System.Text.Json only fails later, when a string or a
        // property name is read, so the validator has to handle the read failing.
        var json = "{\"name\":\"" + Escape("d800") + "\",\"skills\":[\"" + Escape("dc00") + "\"]}";
        Assert.Equal(
            ["name:invalid-characters", "skills[0]:invalid-characters"],
            Sorted(Validator.Validate(JsonNode.Parse(json), PortfolioMode.Draft)));
    }

    [Theory]
    [InlineData("{\"{0}\":1}", "$:invalid-characters")]
    [InlineData("{\"links\":{\"{0}\":1}}", "links:invalid-characters")]
    [InlineData("{\"projects\":[{\"title\":\"App\",\"{0}\":1}]}", "projects[0]:invalid-characters")]
    public void ALoneSurrogateEscapeInAParsedFieldNameIsAProblemNotAnException(string template, string expected)
    {
        var node = JsonNode.Parse(template.Replace("{0}", Escape("d800"), StringComparison.Ordinal));
        Assert.Equal([expected], Sorted(Validator.Validate(node, PortfolioMode.Draft)));
    }

    // The backslash is built from a char code so this source never contains a surrogate escape.
    private static string Escape(string hex) => (char)92 + "u" + hex;

    [Fact]
    public void ValidatingDoesNotModifyTheInput()
    {
        var input = JsonNode.Parse("""{"name":"Riya","skills":["a"],"links":{"github":"https://github.com/riya"}}""")!;
        var before = input.ToJsonString();
        Validator.Validate(input, PortfolioMode.Publish);
        Assert.Equal(before, input.ToJsonString());
    }

    [Fact]
    public void ValidUsernamesAndPortfoliosReportNothing()
    {
        Assert.Empty(Validator.ValidateUsername("riya-sharma"));
        Assert.Empty(Validator.Validate(JsonNode.Parse("""{"name":"Riya","headline":"Student"}"""), PortfolioMode.Publish));
    }

    [Fact]
    public void ReservedNamesCoverTheNamesListedInTheDecisionRecord()
    {
        foreach (var name in new[] { "www", "api", "app", "admin", "mail", "docs", "blog", "login", "support", "help", "procoderji", "satyam", "learn", "practice", "account", "dashboard", "games", "guides", "jobs" })
            Assert.Contains(name, PortfolioRulesForTest().Username.Reserved);
    }

    [Fact]
    public void IncompleteRulesAreRejectedAtStartup()
    {
        Assert.Throws<InvalidDataException>(() => PortfolioRules.FromJson("{}"));
        Assert.Throws<InvalidDataException>(() => PortfolioRules.FromJson("""{"version":2}"""));
        Assert.Throws<InvalidDataException>(() => PortfolioRules.FromJson("not json"));
    }

    [Fact]
    public void AMissingRuleKeyFailsLoudlyInsteadOfSkippingTheCheck()
    {
        var rules = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "portfolio-rules.json")))!.AsObject();
        rules["maxLength"]!.AsObject().Remove("name");
        var validator = new PortfolioValidator(PortfolioRules.FromJson(rules.ToJsonString()));
        Assert.Throws<InvalidDataException>(() => validator.Validate(JsonNode.Parse("""{"name":"Riya"}"""), PortfolioMode.Draft));
    }

    [Fact]
    public void AHugeValueIsRejectedQuickly()
    {
        var started = DateTime.UtcNow;
        var huge = JsonNode.Parse(JsonSerializer.Serialize(new { links = new { github = "https://" + new string('a', 2_000_000) } }));
        Assert.Equal(["links.github:too-long"], Sorted(Validator.Validate(huge, PortfolioMode.Draft)));
        Assert.True(DateTime.UtcNow - started < TimeSpan.FromSeconds(2));
    }

    private static PortfolioRules PortfolioRulesForTest() =>
        PortfolioRules.LoadDefault();
}
