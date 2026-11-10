using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace ProCoderJi.Api.Features.Practice;

/// <summary>Loads the same reviewed question definitions used by the frontend.</summary>
public sealed class PracticeQuestionBank
{
    public const int MaxSessionQuestions = 30;
    public const int MaxDurationSeconds = 7_200;

    private static readonly HashSet<string> Topics = ["quantitative", "reasoning", "verbal", "programming"];
    private static readonly HashSet<string> OptionIds = ["a", "b", "c", "d"];
    private static readonly Regex StableId = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.CultureInvariant);
    private static readonly Regex Uuid = new("^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", RegexOptions.CultureInvariant);
    private static readonly JsonSerializerOptions QuestionJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };
    private readonly Dictionary<string, QuestionDefinition> questions;

    public PracticeQuestionBank(IWebHostEnvironment environment)
        : this(File.ReadAllText(ResolvePath(environment))) { }

    private PracticeQuestionBank(string json)
    {
        List<QuestionDefinition>? definitions;
        try { definitions = JsonSerializer.Deserialize<List<QuestionDefinition>>(json, QuestionJson); }
        catch (JsonException cause) { throw new InvalidDataException("The shared practice question bank is not valid JSON.", cause); }
        if (definitions is null || definitions.Count == 0) throw new InvalidDataException("The shared practice question bank is empty.");
        questions = new Dictionary<string, QuestionDefinition>(StringComparer.Ordinal);
        foreach (var question in definitions)
        {
            if (question is null || string.IsNullOrWhiteSpace(question.Id) || !StableId.IsMatch(question.Id)
                || !Topics.Contains(question.TopicId ?? string.Empty)
                || question.Difficulty is not ("easy" or "medium")
                || string.IsNullOrWhiteSpace(question.Prompt) || string.IsNullOrWhiteSpace(question.Explanation)
                || question.Options is null || question.Options.Count != 4
                || question.Options.Any(option => option is null || !OptionIds.Contains(option.Id ?? string.Empty) || string.IsNullOrWhiteSpace(option.Text))
                || question.Options.Select(option => option.Id).Distinct(StringComparer.Ordinal).Count() != 4
                || question.Options.Select(option => option.Text.Trim()).Distinct(StringComparer.Ordinal).Count() != 4
                || question.Options.Count(option => option.Id == question.AnswerId) != 1)
                throw new InvalidDataException("A shared practice question has invalid fields or answer options.");
            if (!questions.TryAdd(question.Id, question)) throw new InvalidDataException($"Duplicate shared practice question ID: {question.Id}");
        }
        if (Topics.Any(topic => !questions.Values.Any(question => question.TopicId == topic)))
            throw new InvalidDataException("Every practice topic must contain a reviewed question.");
    }

    public int QuestionCount => questions.Count;

    /// <summary>Allows deterministic validation tests without a web host or database.</summary>
    public static PracticeQuestionBank FromJson(string json) => new(json);

    public bool TryValidate(ProgressAttemptDto? attempt, DateTimeOffset now, out ValidatedAttempt? valid)
    {
        valid = null;
        if (attempt is null) return false;
        var topicId = attempt.TopicId;
        if (!Uuid.IsMatch(attempt.Id.ToString("D"))
            || string.IsNullOrEmpty(attempt.CompletedAt)
            || !DateTimeOffset.TryParseExact(attempt.CompletedAt, "yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var completedAt)
            || completedAt <= DateTimeOffset.UnixEpoch || completedAt > now.AddMinutes(5)
            || string.IsNullOrEmpty(topicId) || !Topics.Contains(topicId)
            || attempt.DurationSeconds is < 0 or > MaxDurationSeconds
            || attempt.QuestionIds is null || attempt.QuestionIds.Count is < 1 or > MaxSessionQuestions
            || attempt.Responses is null || attempt.Responses.Count > attempt.QuestionIds.Count)
            return false;

        var selectedQuestions = new HashSet<string>(StringComparer.Ordinal);
        foreach (var id in attempt.QuestionIds)
        {
            if (string.IsNullOrEmpty(id) || !selectedQuestions.Add(id)
                || !questions.TryGetValue(id, out var question) || question.TopicId != topicId)
                return false;
        }
        var answered = new HashSet<string>(StringComparer.Ordinal);
        foreach (var response in attempt.Responses)
        {
            if (response is null || string.IsNullOrEmpty(response.QuestionId) || !selectedQuestions.Contains(response.QuestionId)
                || !answered.Add(response.QuestionId)
                || !questions[response.QuestionId].Options!.Any(option => option.Id == response.OptionId))
                return false;
        }
        valid = new ValidatedAttempt(attempt.Id, completedAt, topicId, [.. attempt.QuestionIds], [.. attempt.Responses], attempt.DurationSeconds);
        return true;
    }

    private static string ResolvePath(IWebHostEnvironment environment)
    {
        var outputPath = Path.Combine(AppContext.BaseDirectory, "Data", "questions.json");
        return File.Exists(outputPath) ? outputPath : Path.Combine(environment.ContentRootPath, "Data", "questions.json");
    }

    private sealed record QuestionDefinition(string Id, string TopicId, string Difficulty, string Prompt,
        List<OptionDefinition>? Options, string AnswerId, string Explanation);
    private sealed record OptionDefinition(string Id, string Text);
}
