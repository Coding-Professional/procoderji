# Portfolio storage and API

Phase 1 provides the `/learn/portfolio` editor and public `/u/<username>` pages. The backend
stores one private draft and an explicit published snapshot per account. See the
[workspace guide](portfolio-workspace.md) for the student journey and launch runbook,
[shared rules](../shared/portfolio/README.md) for validation, and
[ADR 0002](decisions/0002-student-portfolios.md) for the accepted product boundaries.

## Launch setting

`Portfolio__PublishingEnabled` defaults to **false**, including local development. Drafts and
username claims work with a configured account service; publishing returns 503
`publishing-disabled`, public snapshot/state reads return 404, and the public index is empty.
An operator enables it after the deployment checks in the workspace guide. Implemented features
do not establish production deployment; [#74](https://github.com/procoderji-com/procoderji/issues/74)
tracks the outstanding frontend hosting work.

## Authentication and request format

Browser requests go through the Next.js `/api/platform/*` proxy. Owner requests require a valid
Google account session and `X-Account-Id` matching that session. Mutations also require the exact
frontend `Origin` and `X-CSRF-Token` returned by `/api/platform/auth/session`.

Mutations accept JSON with a maximum body size of 256 KiB, including streamed bodies. Unknown
request fields are rejected. The server validates portfolio data and usernames with the shared
.NET validator. The client cannot supply the owner ID or status.

API responses use `private, no-store` and `X-Robots-Tag: noindex`. Public HTML uses the
published search-visibility setting for its metadata; private data is never cached publicly.

## Endpoints

| Method and path | Behavior |
| --- | --- |
| `GET /api/platform/portfolio` | `{ portfolio, publishingEnabled, policyVersion, minimumPublishingAge }`; `portfolio` is null before creation. |
| `POST /api/platform/portfolio/draft` | Save `{ data, searchVisible, revision }`; creates a private draft when `revision` is null. |
| `GET /api/platform/portfolio/username?username=riya-student` | Validate a username and report availability for the signed-in owner. |
| `POST /api/platform/portfolio/username` | Claim `{ username, revision }`; can create an empty draft with `revision: null`. |
| `POST /api/platform/portfolio/publish` | Publish the current draft using the revision and explicit eligibility payload below. |
| `POST /api/platform/portfolio/unpublish` | Remove the public snapshot using `{ revision }`. |
| `DELETE /api/platform/portfolio` | Delete the owner's portfolio using `{ revision }`; returns 204 when already absent. |
| `GET /api/platform/portfolio/public/{username}` | Published snapshot only; otherwise 404. Optional `?version=<public-version>` must match. |
| `GET /api/platform/portfolio/public/{username}/state` | Fresh public `{ username, version, searchVisible, publishedAt }`; otherwise 404. |
| `GET /api/platform/portfolio/public?limit=1000&after=<username>` | Published, search-opted-in index: `{ portfolios: [{ username, publishedAt }], nextCursor }`. Limit is 1–1000; omit `after` for the first page. |

A mutation response contains `{ portfolio }`. Always use its current `revision` for the next
mutation. The `revision` field must be present in every mutation request: null is allowed only
for creating a draft or making its first username claim. A stale revision returns 409, so two
devices cannot silently overwrite each other's edits.

Example first draft:

```json
{
  "data": {
    "theme": "simple",
    "name": "Riya",
    "headline": "Computer science student",
    "skills": ["C#", "PostgreSQL"]
  },
  "searchVisible": false,
  "revision": null
}
```

The owner record includes draft `data`, `username`, `searchVisible`, `status`, `revision`,
`createdAt`, `updatedAt`, `publishedAt`, `publishingPolicyVersion` and `eligibilityConfirmedAt`.
The public snapshot includes only `username`, published `data`, published `searchVisible`,
`publishedAt` and an opaque `version`. It excludes account identity, Google profile, draft,
editing revision and publishing acceptance metadata.

## Publication policy and state

Phase 1 publishing requires self-declaration of being **18 or older** and having read the
portfolio Terms and Privacy Policy. The current policy version is **`2026-11-11`**, defined with
the minimum age in `shared/portfolio/rules.json`. Use the workspace's policy version:

```json
{
  "revision": "CURRENT-REVISION-UUID",
  "eligibility": {
    "atLeast18": true,
    "policyVersion": "2026-11-11"
  }
}
```

The backend records the accepted version and server timestamp privately. No date of birth is
collected; this is self-declaration, not independent age verification. Public endpoints exclude
snapshots without current acceptance. The policy text is not evidence of qualified legal review.

Saving a draft does not replace an existing published snapshot or its search visibility.
Publishing copies the validated draft and its visibility setting together. A username is
required, and the publish validator additionally requires a name and headline.

The username is **fixed while the portfolio exists**; a repeated claim of the same name is
allowed with the current revision. Deleting an ordinary portfolio releases its claim.

`draft`, `published` and `suspended` are server-owned states. Public reads never return drafts
or suspended records. A suspended owner can edit their private draft or unpublish, but those
actions preserve the suspension. Publishing and portfolio deletion return 403 until an operator
restores it, preventing a delete/recreate publication bypass. Restore returns a private draft
and clears publication and acceptance; the student must review and publish again. See the
[operator procedure](../backend/README.md#portfolio-moderation). There is no student-accessible
moderation endpoint.

The historical last `publishedAt` is retained after unpublishing. Deletion removes the portfolio
and both snapshots. Deleting practice history does not delete a portfolio. Removing the owning
account cascades through a relational foreign key or removes MongoDB's embedded portfolio.
There is no self-service account-deletion endpoint; use the existing operator contact.

## Public delivery and cache

Every public page/metadata request reads fresh backend state with `no-store` before using a
cached snapshot. Only validated published data is cached, keyed by backend origin, username
and opaque public version, with one-hour revalidation. The version does not expose the private
editing revision. A publication racing the state read is retried once against fresh state.

Successful publish, unpublish and delete through the BFF immediately invalidate the username's
cache tag using the trusted upstream username header. Fresh state remains authoritative for
operator CLI changes, which do not call Next.js invalidation: subsequent requests return 404
after suspension, unpublishing, deletion or disabling publication.

Search visibility defaults off. Public HTML is `noindex` and absent from the sitemap until an
opted-in version is published; a public address remains accessible to anyone who knows it.
The dynamic sitemap reads the public index afresh and includes only current-policy, published,
opted-in pages. The frontend accepts up to **45,000 portfolio URLs**, reserving space under the
sitemap URL limit. It fails rather than silently omitting later pages when another index page
exists. Partition the sitemap before growing beyond that cap.

## Storage and migration

- SQLite, PostgreSQL/Neon and SQL Server use the `Portfolios` table, with one row per account,
  a unique nullable username and revision/status concurrency guards.
- MongoDB embeds the portfolio in the existing account document. A partial unique index claims
  usernames, and conditional updates change only the expected portfolio revision/status.
- Run the normal `--migrate` release command before starting the new version. It applies the
  relational portfolio/policy migrations or creates MongoDB's portfolio username index.
  Existing accounts/progress remain intact. Older snapshots without current acceptance stay
  private until the student publishes with it.

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
(409), `publishing-eligibility-required` (400), `policy-changed` (409), `rate-limited` (429),
and `publishing-disabled` (503). Malformed/unknown JSON fields return 400, invalid content types
return 415, and oversized bodies return 413.

## Verify a change

Run `dotnet test backend/ProCoderJi.slnx --configuration Release`. The shared API tests run with
SQLite by default and with each configured disposable PostgreSQL, SQL Server or MongoDB test
server. They cover authentication, CSRF, validation/body limits, concurrent claims and edits,
publication snapshots, suspension, account cascading, and per-account rate limits. Provider
tests also cover incremental migrations and MongoDB document ownership. Use
`E2E_DOTNET=1 npm run e2e` for real BFF/browser journeys with disposable test-only accounts;
see [browser checks](development.md#browser-checks). External Google consent is not automated.

Never point the integration-test variables at a production database. See
[backend test configuration](../backend/README.md#tests).
