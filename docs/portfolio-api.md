# Portfolio storage and API

The portfolio backend stores private drafts and explicit published snapshots using the shared
rules in `shared/portfolio/`. It is the backend portion of [#43](https://github.com/procoderji-com/procoderji/issues/43).
Public pages and the editor are tracked by #44 and #45.

## Launch setting

`Portfolio__PublishingEnabled` defaults to **false**. Students can prepare a draft and claim a
username, but publication returns `503` with `publishing-disabled`, and public reads return 404.
Enable publishing only after the owner decisions in [ADR 0002](decisions/0002-student-portfolios.md)
and the moderation/privacy launch work in #47 and #48 are complete. This API does not decide the
minimum age or publish legal wording on the owner's behalf.

## Authentication and request format

Browser requests go through the Next.js `/api/platform/*` proxy. Owner requests require a valid
Google account session and `X-Account-Id` matching that session. Mutations also require the exact
frontend `Origin` and `X-CSRF-Token` returned by `/api/platform/auth/session`.

Mutations accept JSON with a maximum body size of 256 KiB, including streamed bodies. Unknown
request fields are rejected. The server validates portfolio data and usernames with the shared
.NET validator. The client cannot supply the owner ID or status.

Every response is uncached. API JSON carries `X-Robots-Tag: noindex`; the future public page
uses the published search-visibility setting when creating its own metadata.

## Endpoints

| Method and path | Behavior |
| --- | --- |
| `GET /api/platform/portfolio` | Owner's draft and metadata, or `portfolio: null`; also returns `publishingEnabled`. |
| `POST /api/platform/portfolio/draft` | Save `{ data, searchVisible, revision }`; creates a private draft when `revision` is null. |
| `GET /api/platform/portfolio/username?username=riya-student` | Validate a username and report availability for the signed-in owner. |
| `POST /api/platform/portfolio/username` | Claim `{ username, revision }`; can create an empty draft with `revision: null`. |
| `POST /api/platform/portfolio/publish` | Validate the current draft for publication and atomically publish it using `{ revision }`. |
| `POST /api/platform/portfolio/unpublish` | Remove the public snapshot using `{ revision }`. |
| `DELETE /api/platform/portfolio` | Delete the owner's portfolio using `{ revision }`; returns 204 when already absent. |
| `GET /api/platform/portfolio/public/{username}` | Anonymous read of published fields only; otherwise 404. |

A mutation response contains `{ portfolio }`. Always use its current `revision` for the next
mutation. The `revision` field must be present in every mutation request: null is allowed only
for creating a draft or making its first username claim. A stale revision returns 409, so two
devices cannot silently overwrite each other's edits.

Example first draft:

```json
{
  "data": {
    "name": "Riya",
    "headline": "Computer science student",
    "skills": ["C#", "PostgreSQL"]
  },
  "searchVisible": false,
  "revision": null
}
```

The owner response includes draft `data`, `username`, `searchVisible`, `status`, `revision`,
`createdAt`, `updatedAt` and `publishedAt`. Public responses include only `username`, published
`data`, published `searchVisible` and `publishedAt`. Internal account identity, Google profile
data and unpublished edits never enter that public response.

## Publication and moderation

Saving a draft does not replace an existing published snapshot or its search visibility.
Publishing copies the validated draft and its visibility setting together. A username is
required, and the publish validator additionally requires a name and headline.

This API version keeps an existing username claim immutable; a repeated claim of the same name
is allowed with the current revision. Deleting an ordinary portfolio releases its claim. A
rename policy still needs the owner's decision before public launch.

`draft`, `published` and `suspended` are server-owned states. Public reads never return drafts
or suspended records. A suspended owner can edit their private draft or unpublish, but those
actions preserve the suspension. Publishing and portfolio deletion return 403 until an operator
restores it, preventing a delete/recreate publication bypass. The operator procedure is tracked
by #47; this API exposes no student-accessible suspension endpoint.

The historical last `publishedAt` is retained after unpublishing. Deletion removes the portfolio
and both snapshots. Removing the owning account record cascades through a relational foreign
key, or inherently removes MongoDB's embedded portfolio. Account-management UI is separate work.

## Storage and migration

- SQLite, PostgreSQL/Neon and SQL Server use the `Portfolios` table, with one row per account,
  a unique nullable username and revision/status concurrency guards.
- MongoDB embeds the portfolio in the existing account document. A partial unique index claims
  usernames, and conditional updates change only the expected portfolio revision/status.
- Run the normal `--migrate` release command before starting the new version. It applies the
  incremental relational migration or creates MongoDB's portfolio username index. Existing
  account/progress records remain intact.

Follow [Neon setup](neon.md) for direct migration and pooled runtime connections. PostgreSQL
runtime startup must not apply migrations through the transaction pooler.

## Rate limits and errors

Each API process allows **10 portfolio mutations per minute per authenticated account**, and
**30 username availability checks per minute per account**. The policies are separate, return
429 with `Retry-After`, and do not trust a browser-supplied account ID as the rate-limit key.
These are process-local limits; a deployment with multiple replicas also needs an infrastructure
limit appropriate to its traffic.

Common error codes are `validation-failed` (400, with field `problems`), `sign-in-required` (401),
`suspended` (403), `not-found` (404), `stale-revision`, `username-taken` and `username-locked`
(409), `rate-limited` (429), and `publishing-disabled` (503). Invalid content types return 415;
oversized bodies return 413.

## Verify a change

Run `dotnet test backend/ProCoderJi.slnx --configuration Release`. The shared API tests run with
SQLite by default and with each configured disposable PostgreSQL, SQL Server or MongoDB test
server. They cover authentication, CSRF, validation/body limits, concurrent claims and edits,
publication snapshots, suspension, account cascading, and per-account rate limits. Provider
tests also cover incremental migrations and MongoDB document ownership.

Never point the integration-test variables at a production database. See
[backend test configuration](../backend/README.md#tests).
