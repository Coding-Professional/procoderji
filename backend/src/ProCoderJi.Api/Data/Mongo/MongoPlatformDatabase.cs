using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Features.Progress;

namespace ProCoderJi.Api.Data.Mongo;

/// <summary>Mongo documents use string IDs so no process-wide GUID serializer convention is needed.</summary>
public sealed class MongoPlatformDatabase(IMongoDatabase database)
{
    // Progress generations must be read from the primary, including when the connection URI
    // selects a different read preference for other consumers of the database.
    public IMongoDatabase Database { get; } = database.WithReadPreference(ReadPreference.Primary).WithWriteConcern(WriteConcern.WMajority);
    public IMongoCollection<MongoUserDocument> Users => Database.GetCollection<MongoUserDocument>("users");
    public IMongoCollection<MongoProgressDocument> Progress => Database.GetCollection<MongoProgressDocument>("progress");
    public IMongoCollection<MongoKeyDocument> Keys => Database.GetCollection<MongoKeyDocument>("dataProtectionKeys");

    /// <summary>MongoDB has no EF migrations; provisioning creates the identity uniqueness boundary.</summary>
    public Task InitializeAsync(CancellationToken cancellationToken = default) => Users.Indexes.CreateOneAsync(
        new CreateIndexModel<MongoUserDocument>(Builders<MongoUserDocument>.IndexKeys.Ascending(user => user.GoogleSubject),
            new CreateIndexOptions { Unique = true, Name = "IX_users_GoogleSubject" }), cancellationToken: cancellationToken);
}

public static class MongoDatabaseRegistration
{
    public static IServiceCollection AddMongoDatabase(this IServiceCollection services)
    {
        // Resolve configuration from the final host, including WebApplicationFactory overrides.
        // Relational deployments never resolve these Mongo services or open Mongo connections.
        services.AddSingleton<IMongoClient>(provider =>
        {
            var configuration = provider.GetRequiredService<IConfiguration>();
            var connection = configuration.GetConnectionString("Platform");
            if (string.IsNullOrWhiteSpace(connection))
                throw new InvalidOperationException("MongoDb requires ConnectionStrings:Platform.");
            var settings = MongoClientSettings.FromConnectionString(connection);
            settings.ApplicationName = "ProCoderJi.Platform";
            return new MongoClient(settings);
        });
        services.AddSingleton<IMongoDatabase>(provider =>
        {
            var name = provider.GetRequiredService<IConfiguration>()["Database:Name"];
            if (string.IsNullOrWhiteSpace(name)) throw new InvalidOperationException("MongoDb requires Database:Name.");
            return provider.GetRequiredService<IMongoClient>().GetDatabase(name);
        });
        services.AddSingleton<MongoPlatformDatabase>();
        services.AddSingleton<MongoAccountStore>();
        services.AddSingleton<MongoProgressStore>();
        services.AddSingleton<MongoXmlRepository>();
        return services;
    }
}

public sealed class MongoUserDocument
{
    [BsonId] public required string Id { get; set; }
    public required string GoogleSubject { get; set; }
    public required string Email { get; set; }
    public required string Name { get; set; }
    public long CreatedAtUtc { get; set; }

    public LearnerUser ToUser() => new()
    {
        Id = Guid.Parse(Id), GoogleSubject = GoogleSubject, Email = Email, Name = Name, CreatedAtUtc = CreatedAtUtc
    };
}

public sealed class MongoProgressDocument
{
    [BsonId] public required string Id { get; set; }
    public required string Generation { get; set; }
    public required string Revision { get; set; }
    public List<MongoAttemptDocument> Attempts { get; set; } = [];
}

public sealed class MongoAttemptDocument
{
    public required string Id { get; set; }
    public required string TopicId { get; set; }
    public long CompletedAtUtc { get; set; }
    public int DurationSeconds { get; set; }
    public required string[] QuestionIds { get; set; }
    public required MongoResponseDocument[] Responses { get; set; }

    public static MongoAttemptDocument From(ValidatedAttempt attempt) => new()
    {
        Id = attempt.Id.ToString("D"), TopicId = attempt.TopicId, CompletedAtUtc = attempt.CompletedAt.ToUnixTimeMilliseconds(),
        DurationSeconds = attempt.DurationSeconds, QuestionIds = [.. attempt.QuestionIds],
        Responses = attempt.Responses.Select(response => new MongoResponseDocument { QuestionId = response.QuestionId, OptionId = response.OptionId }).ToArray()
    };

    public ProgressAttemptDto ToDto() => new ValidatedAttempt(Guid.Parse(Id), DateTimeOffset.FromUnixTimeMilliseconds(CompletedAtUtc),
        TopicId, QuestionIds, Responses.Select(response => new PracticeResponseDto(response.QuestionId, response.OptionId)).ToArray(), DurationSeconds).ToDto();
}

public sealed class MongoResponseDocument
{
    public required string QuestionId { get; set; }
    public required string OptionId { get; set; }
}

public sealed class MongoKeyDocument
{
    [BsonId] public required string Id { get; set; }
    public required string FriendlyName { get; set; }
    public required string Xml { get; set; }
}
