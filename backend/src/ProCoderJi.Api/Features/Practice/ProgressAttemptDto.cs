using System.Globalization;
using System.Text.Json.Serialization;

namespace ProCoderJi.Api.Features.Practice;

/// <summary>Raw responses are accepted; clients cannot provide trusted scores.</summary>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ProgressAttemptDto(
    [property: JsonRequired, JsonPropertyName("id")] Guid Id,
    [property: JsonRequired, JsonPropertyName("completedAt")] string CompletedAt,
    [property: JsonRequired, JsonPropertyName("topicId")] string TopicId,
    [property: JsonRequired, JsonPropertyName("questionIds")] List<string>? QuestionIds,
    [property: JsonRequired, JsonPropertyName("responses")] List<PracticeResponseDto>? Responses,
    [property: JsonRequired, JsonPropertyName("durationSeconds")] int DurationSeconds);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record PracticeResponseDto(
    [property: JsonRequired, JsonPropertyName("questionId")] string QuestionId,
    [property: JsonRequired, JsonPropertyName("optionId")] string OptionId);

public sealed record ValidatedAttempt(
    Guid Id,
    DateTimeOffset CompletedAt,
    string TopicId,
    string[] QuestionIds,
    PracticeResponseDto[] Responses,
    int DurationSeconds)
{
    public ProgressAttemptDto ToDto() => new(
        Id,
        CompletedAt.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture),
        TopicId,
        [.. QuestionIds],
        [.. Responses],
        DurationSeconds);
}
