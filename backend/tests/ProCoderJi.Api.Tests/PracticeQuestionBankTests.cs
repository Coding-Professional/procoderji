using System.Text.Json;
using System.Text.Json.Nodes;
using ProCoderJi.Api.Features.Practice;
using Xunit;

namespace ProCoderJi.Api.Tests;

public sealed class PracticeQuestionBankTests
{
    private const string QuestionId = "quant-discount-price";
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);
    private static string BankJson => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "questions.json"));
    private static PracticeQuestionBank Bank() => PracticeQuestionBank.FromJson(BankJson);
    private static ProgressAttemptDto Attempt() => new(
        Guid.Parse("c359a679-f4be-4b0d-8c2b-ff0314e37228"),
        "2026-11-01T10:00:00.000Z", "quantitative", [QuestionId],
        [new PracticeResponseDto(QuestionId, "b")], 30);

    [Fact]
    public void SharedBankLoadsAllTwentyFourCanonicalQuestions()
    {
        Assert.True(Bank().QuestionCount >= 24);
    }

    [Fact]
    public void ValidatedAttemptsKeepRawResponsesAndRoundTripCanonicalJavascriptDates()
    {
        var bank = Bank();
        Assert.True(bank.TryValidate(Attempt(), Now, out var valid));
        Assert.NotNull(valid);
        Assert.Equal("2026-11-01T10:00:00.000Z", valid.ToDto().CompletedAt);
        Assert.Equal(Attempt().Id, valid.Id);
        Assert.Single(valid.Responses);
        Assert.True(bank.TryValidate(Attempt() with { Responses = [] }, Now, out var unanswered));
        Assert.Empty(unanswered!.Responses);
    }

    [Fact]
    public void CanonicalQuestionsTopicsAndOptionsAreRequired()
    {
        var bank = Bank();
        Assert.False(bank.TryValidate(null, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { Id = Guid.Empty }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { TopicId = "unknown" }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { TopicId = "reasoning" }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = ["invented-question"] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { Responses = [new(QuestionId, "z")] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { Responses = [new("quant-ratio-share", "a")] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = null }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = [null!] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { Responses = null }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { Responses = [null!] }, Now, out _));
    }

    [Fact]
    public void QuestionsAndResponsesCannotBeCountedTwice()
    {
        var bank = Bank();
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = [QuestionId, QuestionId] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = [QuestionId, "quant-ratio-share"], Responses = [new(QuestionId, "a"), new(QuestionId, "b")] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = [] }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { QuestionIds = Enumerable.Repeat(QuestionId, 31).ToList() }, Now, out _));
    }

    [Theory]
    [InlineData("2026-02-31T10:00:00.000Z")]
    [InlineData("1970-01-01T00:00:00.000Z")]
    [InlineData("2026-11-10T12:05:00.001Z")]
    [InlineData("2026-11-01T10:00:00.0000000Z")]
    [InlineData("2026-11-01T10:00:00.000+00:00")]
    [InlineData("")]
    public void NonCanonicalImpossibleOrFutureTimestampsAreRejected(string completedAt)
    {
        Assert.False(Bank().TryValidate(Attempt() with { CompletedAt = completedAt }, Now, out _));
    }

    [Fact]
    public void DurationAndClockSkewLimitsMatchTheFrontend()
    {
        var bank = Bank();
        Assert.False(bank.TryValidate(Attempt() with { DurationSeconds = -1 }, Now, out _));
        Assert.False(bank.TryValidate(Attempt() with { DurationSeconds = 7_201 }, Now, out _));
        Assert.True(bank.TryValidate(Attempt() with { DurationSeconds = 7_200, CompletedAt = "2026-11-10T12:05:00.000Z" }, Now, out _));
    }

    [Fact]
    public void ValidatedCollectionsAreCopiedFromMutableRequestLists()
    {
        var input = Attempt();
        Assert.True(Bank().TryValidate(input, Now, out var valid));
        input.QuestionIds!.Clear();
        input.Responses!.Clear();
        Assert.Single(valid!.QuestionIds);
        Assert.Single(valid.Responses);
        var output = valid.ToDto();
        output.QuestionIds!.Clear();
        output.Responses!.Clear();
        Assert.Single(valid.QuestionIds);
        Assert.Single(valid.Responses);
    }

    [Fact]
    public void JsonContractsRejectMissingFieldsAndClientProvidedScores()
    {
        var payload = JsonNode.Parse(JsonSerializer.Serialize(Attempt()))!.AsObject();
        payload["scorePercent"] = 100;
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ProgressAttemptDto>(payload.ToJsonString()));
        payload.Remove("scorePercent");
        payload.Remove("durationSeconds");
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ProgressAttemptDto>(payload.ToJsonString()));
        var response = "{\"questionId\":\"quant-discount-price\",\"optionId\":\"b\",\"correct\":true}";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<PracticeResponseDto>(response));
    }

    [Fact]
    public void BankStartupRejectsAmbiguousQuestionsAndUnknownFields()
    {
        var duplicate = JsonNode.Parse(BankJson)!.AsArray();
        duplicate.Add(duplicate[0]!.DeepClone());
        Assert.Throws<InvalidDataException>(() => PracticeQuestionBank.FromJson(duplicate.ToJsonString()));
        var invalidAnswer = JsonNode.Parse(BankJson)!.AsArray();
        invalidAnswer[0]!["answerId"] = "z";
        Assert.Throws<InvalidDataException>(() => PracticeQuestionBank.FromJson(invalidAnswer.ToJsonString()));
        var unknown = JsonNode.Parse(BankJson)!.AsArray();
        unknown[0]!["officialCompanyQuestion"] = true;
        Assert.Throws<InvalidDataException>(() => PracticeQuestionBank.FromJson(unknown.ToJsonString()));
    }
}
