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
