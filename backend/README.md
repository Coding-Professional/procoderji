# ProCoderJii account and progress API

ASP.NET Core 10 provides Google sign-in, server-managed cookie sessions, and durable learner progress. The Next.js app forwards `/api/platform/*` to this service through its server-only BFF. Anonymous browser practice stays available when the backend or Google credentials are not configured.

## Run locally

Install a supported .NET 10 SDK and keep its runtime on the latest servicing patch. From the repository root:

```bash
dotnet restore backend/ProCoderJi.slnx --locked-mode
dotnet run --project backend/src/ProCoderJi.Api
```

The development profile listens on `http://localhost:5100`. Set `DOTNET_API_URL=http://localhost:5100` in the frontend's `.env.local` and run Next.js separately. This URL is server configuration and must never use a `NEXT_PUBLIC_` prefix.

SQLite is the default development provider. The API creates and migrates `backend/src/ProCoderJi.Api/Data/procoderji.db` automatically in Development. Users, progress, and ASP.NET Data Protection keys survive process restarts in that database. Generated databases and build output are ignored by Git.

## Google sign-in

Create a Google OAuth **Web application** client and register this exact local authorized redirect URI:

```text
http://localhost:3000/api/platform/signin-google
```

The callback belongs to the frontend origin, which forwards it to ASP.NET Core. The backend's `PublicOrigin` configuration defaults to `http://localhost:3000` in the checked-in development settings. It determines OAuth callback URLs, allowed return paths, mutation-origin checks, and cookie security. Set it to the actual HTTPS frontend origin in production.

Keep credentials in .NET user secrets locally:

```bash
dotnet user-secrets set --project backend/src/ProCoderJi.Api "Authentication:Google:ClientId" "YOUR_CLIENT_ID"
dotnet user-secrets set --project backend/src/ProCoderJi.Api "Authentication:Google:ClientSecret" "YOUR_CLIENT_SECRET"
```

Deployment environments can instead supply `Authentication__Google__ClientId` and `Authentication__Google__ClientSecret`. These are backend secrets; never commit them or expose them through frontend environment variables. Without both values, the session endpoint reports `configured: false` and the Google challenge returns 503 while guest practice remains available.

Users are linked by Google's stable provider subject, never by matching email addresses. The app stores its own internal UUID plus the provider subject and current email/display name. Cookies contain the internal account identity; provider access/refresh tokens are not retained. Sessions are HttpOnly, SameSite=Lax, and Secure on HTTPS deployments.

## API contract

| Endpoint | Behavior |
| --- | --- |
| `GET /api/platform/auth/session` | Returns `{ configured, user, csrfToken }` and issues the antiforgery cookie. |
| `GET /api/platform/auth/google?returnTo=/learn` | Begins Google OAuth; return URLs stay under approved learning/account paths on `PublicOrigin`. |
| `/api/platform/signin-google` | OAuth middleware callback; requires valid state/correlation. |
| `POST /api/platform/auth/logout` | Clears the session cookie; requires current antiforgery token and same-origin request. |
| `GET /api/platform/progress` | Returns `{ attempts, generation }` for the authenticated account. |
| `POST /api/platform/progress` | Accepts `{ attempts, generation }`; validates questions/answers and inserts immutable attempts idempotently. |
| `DELETE /api/platform/progress` | Deletes the account's attempts and rotates its generation atomically; returns `{ generation }`. |

Progress requests include `x-account-id` matching the signed-in user to reject account-switch races. Mutations also require `Origin` matching `PublicOrigin` and `X-CSRF-Token` obtained from the current session response. A token issued before sign-in/account change must be refreshed. Private responses use `private, no-store`; the BFF preserves cookie and redirect headers.

Attempts store raw question IDs and selected answers, not trusted scores. The backend validates against `shared/practice/questions.json`, which is copied into the API output as `Data/questions.json`. Grading remains reproducible from the canonical bank. This introductory practice is not a proctored or hiring assessment.

Serializable transactions and a state concurrency token serialize sync/reset races. A reset rotates the generation, so old devices cannot silently restore deleted cloud history. Attempts are keyed by account plus session UUID, and the newest 100 are retained per account. Requests are limited to 100 attempts and 256 KiB.

## PostgreSQL and deployment

The same EF Core model and initial migration support PostgreSQL through Npgsql. Supply backend-only configuration:

```text
Database__Provider=Postgres
ConnectionStrings__Platform=Host=YOUR_HOST;Database=YOUR_DATABASE;Username=YOUR_USER;Password=YOUR_PASSWORD
PublicOrigin=https://YOUR_FRONTEND_ORIGIN
```

Run migrations deliberately before starting production replicas:

```bash
dotnet run --project backend/src/ProCoderJi.Api --no-launch-profile -- --migrate
```

This command uses the current environment's database/provider settings and exits after migration. Development and Testing apply migrations automatically; production does so only for `--migrate` or explicit `Database__MigrateOnStartup=true`. Back up the database before schema changes. Keep versioned migrations and the model snapshot together, and validate changes against both providers.

Data Protection keys are stored in the application database with a stable application name, so replicas using the same database can decrypt sessions. Protect database access, backups, and key material at rest, and isolate key rings between deployments. Restrict direct network access to the backend and use the frontend BFF as the public entry point. Configure infrastructure rate limits, HTTPS, operational monitoring, and backups before public account launch.

Razorpay or Paytm integration is planned for a later billing slice. No payment, subscription activation, or live checkout is implemented in this API yet.

## Tests

```bash
dotnet test backend/ProCoderJi.slnx --no-restore
```

The default suite creates isolated SQLite databases and uses test-only authentication registered by `WebApplicationFactory` in the test assembly. The API has no test-header login path. Tests cover anonymous behavior, Google challenge URL construction, CSRF/origin checks, account isolation, immutable sync, generation resets, stale requests, question validation, and retention.

To run the same API contract tests against a **disposable PostgreSQL instance**, set `PROCODERJI_TEST_POSTGRES` to its administrative test connection string before running the command. Each factory creates and drops only its own randomly named schema. Do not point test configuration at a production database. A real Google login still needs operator-provided credentials and an end-to-end callback check in the configured deployment.

## References

- [ASP.NET Core Google authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/google-logins?view=aspnetcore-10.0)
- [ASP.NET Core antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
- [Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0)
