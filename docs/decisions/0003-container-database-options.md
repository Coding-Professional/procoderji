# ADR 0003: containers and database options

- **Status:** Accepted for this implementation
- **Date:** 2026-11-10

## Context

The Next.js deployment does not start the ASP.NET Core backend. Contributors and operators need
a reproducible API image, durable storage, and a choice of PostgreSQL, Microsoft SQL Server, or
MongoDB. Account identity, CSRF protection, immutable practice attempts, and progress resets must
behave the same with each database. SQLite remains useful for setup without a database server.

## Decision

Build the backend with a multi-stage Dockerfile from the repository root. The runtime includes
the shared practice bank and portfolio rules, runs as a non-root user, and listens on port 8080.
The frontend remains a separate application and forwards account requests with `DOTNET_API_URL`.

Choose one database for a deployment using `Database__Provider`. `Postgres` and `SqlServer` use
EF Core; `MongoDb` uses the MongoDB .NET driver. Authentication uses `IAccountStore`, and progress
endpoints use `IProgressStore`. Identity is derived from Google's stable subject and an internal
UUID. The HTTP contracts do not expose database selection to students.

Relational stores retain serializable transactions and bounded transaction retries. Shared
migrations handle provider-specific identity and constraint SQL, with a SQL Server snapshot
alongside the original SQLite/PostgreSQL snapshot. Model-difference tests protect both paths.

MongoDB keeps each student's generation, revision and retained attempts in a single document.
Conditional replacements serialize concurrent syncs and prevent stale uploads from restoring
reset history. The Google subject has a unique index. This design needs no multi-document
transaction or local replica set. Data Protection keys use an XML repository in the same MongoDB
database; relational providers keep their existing EF repository. Index provisioning is part of
the same `--migrate` operator command used for relational schemas.

Docker Compose examples run the API, a one-time provisioning job, and exactly one database on
a shared Docker network. Each database has its own named volume and no published host port.
These examples target development or a Docker host. Vercel container deployments use a remote
database: Compose and its persistent volumes are not a Vercel deployment target. See the
[Vercel deployment explanation](https://vercel.com/i/can-you-run-docker-compose-on-vercel).

## Consequences

- Contributors can start one API/database stack with the documented Compose override.
- Changing providers selects a different store; it does not migrate accounts, progress, or keys.
  Existing installations need a deliberate data migration before switching.
- Provider implementations must pass the same authentication, account-isolation, sync, reset,
  and retention tests. MongoDB also verifies persistence and shared Data Protection keys.
- Relational schema changes must update both snapshots and remain valid on SQLite, PostgreSQL,
  and SQL Server. Mongo document changes need compatible read/write handling and index updates.
- Volumes preserve data across container replacement, while backups and host recovery remain
  operator responsibilities. Production requires appropriate credentials, SQL Server licensing,
  HTTPS configuration, and external storage when the compute platform has an ephemeral filesystem.

## Rejected alternatives

One image containing both the API and database would tie data lifecycle, upgrades and scaling
to application replacement. The separate-container setup keeps those operations independent.

Adding a MongoDB provider string to EF configuration would not preserve relational transactions,
migrations or constraints. A document adapter implements the required account/progress behavior
explicitly and can be verified against the same HTTP contract.
