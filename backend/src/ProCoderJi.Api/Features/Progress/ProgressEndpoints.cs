using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using ProCoderJi.Api.Configuration;
using ProCoderJi.Api.Features.Practice;
using ProCoderJi.Api.Infrastructure;

namespace ProCoderJi.Api.Features.Progress;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record SyncProgressRequest([property: JsonRequired] List<ProgressAttemptDto>? Attempts, [property: JsonRequired] Guid Generation);

public static class ProgressEndpoints
{
    private const int MaxBytes = 256 * 1024;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow };

    public static void MapProgressEndpoints(this WebApplication app)
    {
        app.MapGet("/api/platform/progress", async (HttpContext context, ProgressService service) =>
        {
            var userId = ApiSecurity.UserId(context);
            if (userId is null) return Results.Json(new { error = "Sign in to sync your progress." }, statusCode: 401);
            var accountError = ApiSecurity.CheckAccount(context, userId.Value);
            if (accountError is not null) return accountError;
            return Results.Json(await service.Read(userId.Value, context.RequestAborted));
        });
        app.MapPost("/api/platform/progress", async (HttpContext context, ProgressService service, PracticeQuestionBank bank, PlatformConfiguration configuration, IAntiforgery antiforgery) =>
        {
            var userId = ApiSecurity.UserId(context);
            if (userId is null) return Results.Json(new { error = "Sign in to sync your progress." }, statusCode: 401);
            var accountError = ApiSecurity.CheckAccount(context, userId.Value);
            if (accountError is not null) return accountError;
            var securityError = await ApiSecurity.CheckWrite(context, configuration, antiforgery);
            if (securityError is not null) return securityError;
            if (!context.Request.HasJsonContentType()) return Results.Json(new { error = "Send a JSON progress payload." }, statusCode: 415);
            if (context.Request.ContentLength > MaxBytes) return Results.Json(new { error = "Progress payload is too large." }, statusCode: 413);
            SyncProgressRequest? body;
            try
            {
                using var buffer = new MemoryStream();
                var chunk = new byte[8192];
                int count;
                while ((count = await context.Request.Body.ReadAsync(chunk, context.RequestAborted)) > 0)
                {
                    if (buffer.Length + count > MaxBytes) return Results.Json(new { error = "Progress payload is too large." }, statusCode: 413);
                    await buffer.WriteAsync(chunk.AsMemory(0, count), context.RequestAborted);
                }
                body = JsonSerializer.Deserialize<SyncProgressRequest>(buffer.ToArray(), Json);
            }
            catch (JsonException) { return Results.Json(new { error = "Send valid attempts and a progress generation." }, statusCode: 400); }
            if (body?.Attempts is null || body.Attempts.Count > 100 || body.Generation == Guid.Empty || body.Attempts.Select(attempt => attempt?.Id).Distinct().Count() != body.Attempts.Count)
                return Results.Json(new { error = "Send at most 100 unique attempts and a valid generation." }, statusCode: 400);
            var attempts = new List<ValidatedAttempt>();
            foreach (var attempt in body.Attempts)
            {
                if (!bank.TryValidate(attempt, DateTimeOffset.UtcNow, out var valid) || valid is null) return Results.Json(new { error = "Some practice attempts are invalid." }, statusCode: 400);
                attempts.Add(valid);
            }
            try { return Results.Json(await service.Sync(userId.Value, body.Generation, attempts, context.RequestAborted)); }
            catch (ProgressGenerationConflictException) { return Results.Json(new { error = "Progress was reset on another device. Refresh before syncing." }, statusCode: 409); }
        });
        app.MapDelete("/api/platform/progress", async (HttpContext context, ProgressService service, PlatformConfiguration configuration, IAntiforgery antiforgery) =>
        {
            var userId = ApiSecurity.UserId(context);
            if (userId is null) return Results.Json(new { error = "Sign in to sync your progress." }, statusCode: 401);
            var accountError = ApiSecurity.CheckAccount(context, userId.Value);
            if (accountError is not null) return accountError;
            var securityError = await ApiSecurity.CheckWrite(context, configuration, antiforgery);
            if (securityError is not null) return securityError;
            return Results.Json(new { generation = await service.Reset(userId.Value, context.RequestAborted) });
        });
    }
}
