using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;
using MongoDB.Driver;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Features.Progress;
using ProCoderJi.Api.Features.Portfolio;

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

    /// <summary>MongoDB has no EF migrations; provisioning creates the identity and username boundaries.</summary>
    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await Users.Indexes.CreateManyAsync([
            new CreateIndexModel<MongoUserDocument>(Builders<MongoUserDocument>.IndexKeys.Ascending(user => user.GoogleSubject),
                new CreateIndexOptions { Unique = true, Name = "IX_users_GoogleSubject" }),
            new CreateIndexModel<MongoUserDocument>(Builders<MongoUserDocument>.IndexKeys.Ascending("Portfolio.Username"),
                new CreateIndexOptions<MongoUserDocument>
                {
                    Unique = true,
                    Name = "IX_users_Portfolio_Username",
                    PartialFilterExpression = Builders<MongoUserDocument>.Filter.Type("Portfolio.Username", BsonType.String)
                })
        ], cancellationToken: cancellationToken);
    }
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
        services.AddSingleton<MongoPortfolioStore>();
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
    [BsonIgnoreIfNull] public MongoPortfolioDocument? Portfolio { get; set; }

    public LearnerUser ToUser() => new()
    {
        Id = Guid.Parse(Id), GoogleSubject = GoogleSubject, Email = Email, Name = Name, CreatedAtUtc = CreatedAtUtc
    };
}

/// <summary>Embedded in the owning account so deleting it also removes its private and public portfolio.</summary>
public sealed class MongoPortfolioDocument
{
    [BsonIgnoreIfNull] public string? Username { get; set; }
    public required string DraftJson { get; set; }
    [BsonIgnoreIfNull] public string? PublishedJson { get; set; }
    public bool SearchVisible { get; set; }
    public bool PublishedSearchVisible { get; set; }
    [BsonRepresentation(BsonType.String)] public PortfolioStatus Status { get; set; }
    public required string Revision { get; set; }
    public long CreatedAtUtc { get; set; }
    public long UpdatedAtUtc { get; set; }
    public long? PublishedAtUtc { get; set; }

    public PortfolioRecord ToRecord(Guid userId) => new(userId, Username, DraftJson, PublishedJson,
        SearchVisible, PublishedSearchVisible, Status, Guid.Parse(Revision), CreatedAtUtc, UpdatedAtUtc, PublishedAtUtc);

    public static MongoPortfolioDocument From(PortfolioRecord record) => new()
    {
        Username = record.Username, DraftJson = record.DraftJson, PublishedJson = record.PublishedJson,
        SearchVisible = record.SearchVisible, PublishedSearchVisible = record.PublishedSearchVisible,
        Status = record.Status, Revision = record.Revision.ToString("D"), CreatedAtUtc = record.CreatedAtUtc,
        UpdatedAtUtc = record.UpdatedAtUtc, PublishedAtUtc = record.PublishedAtUtc
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
