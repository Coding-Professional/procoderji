# ProCoderJii account, progress and portfolio API

ASP.NET Core 10 provides Google sign-in, server-managed cookie sessions, durable learner progress,
and portfolio drafts/publication. Next.js forwards `/api/platform/*` through its server-only
BFF. Guest practice and the in-memory portfolio preview work without backend credentials.

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

Portfolio storage and authenticated/public endpoints are documented in the
[portfolio API guide](../docs/portfolio-api.md). The editor, two themes, Markdown import,
moderation and 18+ publishing policy are implemented. `Portfolio__PublishingEnabled` remains
false by default; use the [workspace launch runbook](../docs/portfolio-workspace.md) before
enabling it. Frontend production hosting remains separate work under
[#74](https://github.com/procoderji-com/procoderji/issues/74); this guide does not establish a
deployed production service.

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

## Choose a database

**Neon PostgreSQL is the selected hosted database.** Follow [Neon setup](../docs/neon.md) for
the runtime and migration connections. The other providers remain available for contributors.

Choose one provider per deployment. These are operator settings; students use the same account
and progress API with every provider. SQLite remains the default for development without Docker.

| `Database__Provider` | Storage | Required configuration |
| --- | --- | --- |
| `Sqlite` | Local SQLite file through EF Core | Optional `ConnectionStrings__Platform`; defaults to `Data/procoderji.db`. |
| `Postgres` | PostgreSQL through EF Core/Npgsql | `ConnectionStrings__Platform` with a PostgreSQL connection string. |
| `SqlServer` | Microsoft SQL Server through EF Core | `ConnectionStrings__Platform` with a SQL Server connection string. |
| `MongoDb` | MongoDB through the official .NET driver | MongoDB URI in `ConnectionStrings__Platform`, plus `Database__Name`. |

The API, migrations, and selected database can run together with Docker Compose, in separate
containers with persistent database volumes. Follow [Container setup](../docs/containers.md).
Vercel container deployments need an external durable database; Compose volumes are for a
Docker host. Changing providers does not copy existing data or sessions between databases.

Example backend-only PostgreSQL configuration:

```text
Database__Provider=Postgres
ConnectionStrings__Platform=Host=YOUR_HOST;Database=YOUR_DATABASE;Username=YOUR_USER;Password=YOUR_PASSWORD
PublicOrigin=https://YOUR_FRONTEND_ORIGIN
```

For SQL Server, use `Database__Provider=SqlServer` and a connection string such as
`Server=YOUR_HOST;Database=procoderji;User Id=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False`.
For MongoDB, use `Database__Provider=MongoDb`, `Database__Name=procoderji`, and
`ConnectionStrings__Platform=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/`.
Keep actual credentials in user-secrets or the hosting secret store.

## Provision and deploy

Run migrations deliberately before starting production replicas:

```bash
dotnet run --project backend/src/ProCoderJi.Api --no-launch-profile -- --migrate
```

This command uses the current environment's database/provider settings and exits after
provisioning. It applies EF migrations, including portfolio publishing-policy fields, for
relational databases and creates MongoDB's Google-subject and portfolio-username indexes.
Development and Testing provision automatically; production
does so only for `--migrate` or explicit `Database__MigrateOnStartup=true`. Back up the database
before schema changes. Shared relational migrations contain provider-specific SQL where needed;
keep both the default and SQL Server model snapshots current and run the provider checks.

Data Protection keys are stored in the selected application database with a stable application
name, so replicas using the same database can decrypt sessions. Relational storage uses EF Core;
MongoDB uses a key collection and an XML repository. Protect database access, backups, and key
material at rest, and isolate key rings between deployments. Restrict direct network access to
the backend and use the frontend BFF as the public entry point. Configure infrastructure rate
limits, HTTPS, operational monitoring, and backups before public account launch.

MongoDB stores each account's progress generation, revision and 100 retained attempts in one
document. Conditional atomic writes preserve reset and immutable-attempt behavior without a
replica set or multi-document transactions. See [ADR 0003](../docs/decisions/0003-container-database-options.md).

Razorpay or Paytm integration is planned for a later billing slice. No payment, subscription activation, or live checkout is implemented in this API yet.

## Portfolio moderation

Each public portfolio's **Report this page** link opens an email to `procoderji@gmail.com` with
its canonical address. Operators review reports and can run these commands using the deployed
API's database environment and authorised database credentials:

```bash
dotnet ProCoderJi.Api.dll --portfolio suspend --username riya-student
dotnet ProCoderJi.Api.dll --portfolio restore --username riya-student
```

For a local development database, use
`dotnet run --project backend/src/ProCoderJi.Api --no-launch-profile -- --portfolio suspend --username riya-student`.
Run `--migrate` separately before these commands when the schema needs updating. Moderation
does not start an HTTP server or migrate a database. It prints only username, status and new
revision, excluding student content and provider connection details. Exit codes are 0 success
(including an already-applied state), 2 invalid arguments, 3 missing portfolio, 1 operation
failure, and 130 cancellation. `--portfolio help` prints syntax.

Suspend removes the public snapshot, search visibility and publishing acceptance while
retaining the owner's private draft. Owners may edit/unpublish, but cannot publish or delete
to bypass suspension. Restore returns a private **draft**, not a live page: the student must
review and explicitly accept the current policy and publish again. The CLI uses revision/status
checks and supports relational providers and MongoDB. There is no production moderation HTTP
endpoint or student-supplied admin flag.

Next.js checks fresh publication state before serving cached snapshots, so suspension becomes
404 on the next request without a CLI cache-invalidation callback. Verify the public URL and
sitemap after changes. Keep report decisions and operator access in the deployment's operating
process. Requests to remove a suspended portfolio or an account go to the operator contact;
practice-history deletion is separate.

## Portfolio publishing configuration

Phase 1 fixes usernames while the portfolio exists and requires 18+ self-declaration plus
current Terms/Privacy acceptance for every publication. The server privately stores policy
version `2026-11-11` and confirmation time; it collects no birth date. This product policy does
not establish independent age verification or qualified legal review. Existing snapshots
without current acceptance stay unavailable until the student republishes.

After configuring production Google OAuth, HTTPS `PublicOrigin`, BFF connectivity, durable
storage, migrations, backup/restore, reporting and operator access, set
`Portfolio__PublishingEnabled=true` on the backend to enable publication. Keep it false while
preparing drafts or investigating a public-content incident; disabling it makes public
snapshot/state reads return 404 and empties the public index without deleting drafts. Consult
the [runbook](../docs/portfolio-workspace.md#deployment-runbook) for release checks.

## Tests

```bash
dotnet test backend/ProCoderJi.slnx --no-restore
```

The default suite creates isolated SQLite databases and uses test-only authentication registered by `WebApplicationFactory` in the test assembly. The API has no test-header login path. Tests cover anonymous behavior, Google challenge URL construction, CSRF/origin checks, account isolation, immutable sync, generation resets, stale requests, question validation, and retention.

Full-stack frontend checks (`E2E_DOTNET=1 npm run e2e`) build the separate
`backend/tests/ProCoderJi.BrowserHost` executable. It hosts the real API on loopback with an
owned temporary SQLite database, seeded disposable-account cookies and fixture-only publishing
controls. Origin, CSRF, ownership and persistence still use the real application pipeline.
Its `/__e2e__` endpoints and authentication scheme exist only in the test executable; the
production API Dockerfile publishes `backend/src/ProCoderJi.Api` only. Never deploy BrowserHost.
See [browser checks](../docs/development.md#browser-checks) for coverage and configuration.

To run the same API contract tests against a disposable server, set exactly one of
`PROCODERJI_TEST_POSTGRES`, `PROCODERJI_TEST_SQLSERVER`, or `PROCODERJI_TEST_MONGODB` to its
administrative test connection string. Each factory creates and drops only its randomly named
test schema/database. The MongoDB setting also enables its persistence and Data Protection
integration tests, which otherwise report skipped. Never use a production database for these
tests. The backend-container workflow exercises all three servers and the packaged API.
A real Google login still needs operator-provided credentials and a live callback check.

## References

- [ASP.NET Core Google authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/google-logins?view=aspnetcore-10.0)
- [ASP.NET Core antiforgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0)
- [Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0)
