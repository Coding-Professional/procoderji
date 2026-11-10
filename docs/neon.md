# Neon PostgreSQL deployment

Neon PostgreSQL is the selected database for the hosted student SaaS. The backend already uses
Npgsql through `Database__Provider=Postgres`. This guide configures the existing API; it does not
create a Neon project or deploy a service. Other database adapters remain contributor options.

## Create the database and get connection details

1. Create a Free project named `procoderji` in the [Neon Console](https://console.neon.tech/).
   Choose an available region close to the backend host and keep a separate branch/database for
   staging. Do not share production account data or Data Protection keys with previews.
2. Open **Connect**, select the production branch, database and role, then select **.NET**.
   Use the keyword-style Npgsql string (`Host=...;Database=...;Username=...`), rather than a
   `postgresql://` URL.
3. Copy the **pooled** connection details for the running API. Turn connection pooling off in the
   connection dialog to get the **direct** details for the release migration. Both must target
   the same branch/database.

Use the migration role to provision the schema. The running API needs read/write access to the
application tables and Data Protection keys; grant its runtime role the required permissions
before enabling traffic. See [Neon roles](https://neon.com/docs/manage/roles).

## Runtime and migration connections

| Purpose | Hostname | Settings |
| --- | --- | --- |
| Running API | Pooled hostname containing `-pooler` | `Pooling=true;Minimum Pool Size=0;Maximum Pool Size=10;No Reset On Close=true` |
| One-off migrations | Direct hostname from Neon | `Pooling=false` |

Both use `SSL Mode=VerifyFull;Channel Binding=Require`. The pool cap of 10 is a starting limit
per API process, not a Neon plan guarantee; tune it using measured load and replica count.
Npgsql requires `No Reset On Close=true` when keeping its client pool with transaction-mode
PgBouncer. The current API uses complete serializable transactions and no session-level state.

Keep `Database__MigrateOnStartup=false` and `ASPNETCORE_ENVIRONMENT=Production` on the deployed
API. Development and Testing automatically migrate, so use a direct connection for those
environments. Production migrations must run separately with the direct connection.

## Docker host

Build from the repository root. Copy the secret-free template and replace its placeholders:

```bash
cp deploy/neon.env.example deploy/neon.env
docker compose --env-file deploy/neon.env -f compose.yml -f compose.neon.yml up --build -d
```

PowerShell uses `Copy-Item deploy/neon.env.example deploy/neon.env` for the first command.
The local file is ignored by Git. The Neon override runs one direct-connection migration job,
then starts the API with its pooled connection. It does not start a local database container.
`PUBLIC_ORIGIN` must be the exact HTTPS frontend origin. Compose publishes the API on loopback;
put a reachable HTTPS endpoint in front of it when connecting a deployed frontend.

For later releases, back up the database, build the new image, run the migration, then update
the API:

```bash
docker compose --env-file deploy/neon.env -f compose.yml -f compose.neon.yml build
docker compose --env-file deploy/neon.env -f compose.yml -f compose.neon.yml run --rm migrate
docker compose --env-file deploy/neon.env -f compose.yml -f compose.neon.yml up -d api
```

## Vercel backend container

Follow the [separate backend project setup](containers.md#vercel-containers-use-an-external-database)
using `vercel.backend.json`. Set these in the **backend** project's secret/environment settings:

| Variable | Value |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Database__Provider` | `Postgres` |
| `Database__MigrateOnStartup` | `false` |
| `ConnectionStrings__Platform` | Neon **pooled .NET** connection string with the runtime settings above |
| `PublicOrigin` | Exact HTTPS frontend origin, for example `https://procoderji.com` |
| `PORT` and `ASPNETCORE_HTTP_PORTS` | `8080` |
| `Authentication__Google__ClientId` and `Authentication__Google__ClientSecret` | Backend Google OAuth credentials |

The Vercel project uses the backend variable names above, not the Compose-only `NEON_*`
variables. Run migrations from a trusted release runner: provide the **direct .NET string** as
that process's `ConnectionStrings__Platform`, along with `Database__Provider=Postgres` and the
HTTPS `PublicOrigin`, then run:

```bash
docker build -f backend/Dockerfile -t procoderji-api:local .
docker run --rm --env Database__Provider --env ConnectionStrings__Platform --env PublicOrigin procoderji-api:local --migrate
```

The migration process overrides its own connection only; the running API keeps the pooled
connection. Neither connection belongs in a `NEXT_PUBLIC_` variable.

Set the frontend's `DOTNET_API_URL` to the deployed backend's HTTPS origin. Google OAuth still
returns to `https://procoderji.com/api/platform/signin-google` when that is the frontend origin.
Verify sign-in, sync/reset and session persistence in the actual deployment. No live Neon or
Google connection is established by committing these templates.

## Operations

Monitor database storage and compute usage in Neon. Keep deployment settings aligned with the
selected plan and configure an appropriate backup/recovery process. Store portfolio uploads,
images and videos outside the account database. Before switching an existing installation from
another provider, migrate its records and keys deliberately; changing the provider setting
does not copy them.

## References

- [Neon: .NET/Npgsql setup](https://neon.com/docs/guides/dotnet-npgsql)
- [Neon: pooled and direct connections](https://neon.com/docs/connect/connection-pooling)
- [Npgsql: PgBouncer compatibility](https://www.npgsql.org/doc/compatibility.html#pgbouncer)
- [Npgsql: connection parameters](https://www.npgsql.org/doc/connection-string-parameters.html)
