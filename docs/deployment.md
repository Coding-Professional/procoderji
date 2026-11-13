# Deployment and launch guide

The Next.js frontend and the optional ASP.NET Core account service deploy separately. Contributors
can prepare and test changes locally; an operator with authorised hosting-project access completes
production configuration and rollout.

## Current production observation

Read-only checks on **2026-11-10** found:

| Check | Observed result |
| --- | --- |
| `https://procoderji.com/` and `/about` | HTTP 200; the live About page still used the older Notes branding. |
| `/robots.txt` and `/sitemap.xml` | HTTP 200; the live sitemap contained 10 URLs. |
| `/practice`, `/learn`, and `/api/platform/auth/session` | HTTP 404, although these routes are implemented on the repository's `main` branch. |
| GitHub deployment history | The latest recorded Production deployment was dated 2026-11-02. |

These observations establish a difference between the repository and the live site. The deployment
cause is unconfirmed: inspect the actual Vercel project's connected repository, build logs, source
commit and production assignment. GitHub deployment records alone do not establish the state of
every Vercel deployment.

[Issue #74](https://github.com/procoderji-com/procoderji/issues/74) tracks restoring the current
frontend to production. Resolving the hosting configuration requires access to the authorised
project. Passing repository CI verifies the tested commit; verify the deployed commit and routes
separately after rollout.

## Frontend project and Git integration

Check the existing hosting project after the repository ownership transfer:

| Setting | Expected configuration |
| --- | --- |
| Connected repository | `procoderji-com/procoderji` |
| Production branch | `main` |
| Root directory | Repository root; leave the field unset if that represents the root. |
| Framework | Next.js |
| Node.js | 24.x, matching `package.json`, `.nvmrc` and CI. |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Next.js framework default. |

Use [Vercel's Git integration guide](https://vercel.com/docs/git) to inspect the connected
repository and production branch. Confirm that the GitHub integration can access the transferred
organisation repository and that the desired commit appears in deployment history. A missing
deployment, a failed build and a successful deployment assigned to the wrong domain require
different fixes.

Check the build's source commit and logs before redeploying. Review the preview for the intended
commit, follow the project's production deployment procedure, and confirm which deployment the
production domain serves. [Vercel's Node.js documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
explains the project setting and `package.json` version override.

## Environment variables

Set frontend values in the hosting project's environment settings, separately for Production and
Preview. Google credentials and database connection strings belong on the backend.

| Name | Value | Environments | Purpose |
| --- | --- | --- | --- |
| `YOUTUBE_CHANNEL_ID` | `UC74q2pzSGuoaikYwnavcGMg` | Production, and Preview when desired | Public ID for @Pro_coder_ji; enables the latest-video cards without an API key. Leave unset to hide them. |
| `NEXT_PUBLIC_SITE_URL` | Unset for the production default | Override only when needed, such as staging | The canonical origin defaults to `https://procoderji.com`. This public value is compiled into the build. |
| `DOTNET_API_URL` | Reachable backend origin | Environments with account sync enabled | Server-only; leave unset for guest-only practice. Local example: `http://localhost:5100`. |

Create a new deployment after changing environment configuration, then verify the intended
environment's result. For local development, copy `.env.example` to the ignored `.env.local`.
The Privacy page discloses YouTube thumbnail requests when the channel feed is enabled.

Keep previews separate from production account data and secrets. A staging canonical override
does not itself provide deployment protection or prevent indexing; inspect the preview's access
and robots settings.

## Optional account service and database

**Neon PostgreSQL is the selected hosted database.** Follow [Neon setup](neon.md) for pooled
runtime connections, direct migration connections and backend settings. Selection and setup
instructions do not establish that a live Neon project or account service is configured.

Deploy the [.NET 10 backend](../backend/README.md) independently and run its migration/provisioning
command before enabling account traffic. [Container setup](containers.md) covers the API image and
database options. A frontend deployment does not start the .NET service.

Use PostgreSQL or other durable configured storage for account data. SQLite needs a durable
volume; an ephemeral serverless filesystem cannot preserve accounts. Protect the database's
Data Protection keys along with student data and backups.

Set the backend's `PublicOrigin` to the exact HTTPS frontend origin and register
`<frontend-origin>/api/platform/signin-google` in the Google OAuth client. Keep Google secrets in
the backend host's secret store. Verify actual consent, callback, cookies, progress sync, export
and deletion in the configured deployment before opening accounts to students. Guest practice
remains usable without those credentials.

## Domains and canonical URLs

The code's default canonical origin is `https://procoderji.com`. The apex returned HTTP 200 on
2026-11-10; the older observation that it redirected to `www` is no longer current.

Inspect the live redirect chain and hosting Domains configuration before changing DNS or aliases.
The intended production setup serves the canonical HTTPS origin directly and redirects alternate
hosts to that origin while preserving paths. Compare the final served host with canonical tags,
Open Graph URLs, robots and sitemap entries.

Configure this redirect before enabling Google sign-in. A login started on `www.procoderji.com`
sets a host-only correlation cookie there; a callback to `procoderji.com` cannot receive that
cookie. In the frontend Vercel project's Domains settings, redirect `www.procoderji.com` to
`procoderji.com` with status `308`, preserving the path and query. Verify that even
`https://www.procoderji.com/api/platform/auth/google` redirects to the canonical host before a
correlation cookie is issued. Keep the Google callback and backend `PublicOrigin` on that same
canonical origin. This changes hosting redirects, not DNS records.

Read-only checks:

```bash
curl -sSI https://procoderji.com/
curl -sSI https://www.procoderji.com/
curl -sSI http://procoderji.com/
curl -sS https://procoderji.com/robots.txt
curl -sS https://procoderji.com/sitemap.xml
```

In Windows PowerShell, use `curl.exe` when `curl` is an alias for another command. Investigate
unexpected responses before changing settings. Apply DNS values only when the authorised hosting
project identifies a configuration problem and supplies the required records. Other domains and
separate portfolio sites need their own verified scope.

## Checks before rollout

Use the [contribution checks](../CONTRIBUTING.md#check-your-change) and inspect CI for the final
commit. For a frontend release:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run launch-check
npm run e2e
```

`launch-check` builds and crawls the real content. Browser checks use synthetic fixtures and
refuse to run when `src/data` or `src/content` has local changes. Use `E2E_DOTNET=1` for the
full-stack checks described in [Development](development.md#browser-checks). Backend or shared-rule
changes also need their .NET tests and relevant database contracts.

Latest-video browser checks require internet access and
`YOUTUBE_CHANNEL_ID=UC74q2pzSGuoaikYwnavcGMg`; they report a skip when it is unset. Run those checks
when verifying the channel integration. Review the licences and notices for newly added assets
and content as part of the release.

## Legal metadata and launch decisions

The required owner-provided fields in `src/lib/legal.ts` are currently populated. Verify their
accuracy with the owner, including the effective/publication date and jurisdiction wording,
instead of replacing them with guessed values or today's date.

The code checks whether required values are present and whether the date is valid. That check
controls the legal pages' draft/indexing state; it does not constitute review of the wording.
The owner reviews changes to legal text and public-data policy, with qualified advice where
appropriate. See [ADR 0002](decisions/0002-student-portfolios.md) and
[issue #48](https://github.com/procoderji-com/procoderji/issues/48) for the outstanding portfolio
privacy, terms and age decisions.

Razorpay/Paytm checkout and paid entitlements remain future work. Keep public-portfolio and
monetization launch decisions separate from deploying the current guest practice experience.

## Verify the deployed release

Record the production deployment URL, source commit and verification date. Test a private
browser window and a mobile viewport, and check:

| Route or flow | Expected behavior for the current frontend |
| --- | --- |
| `/`, `/about` | HTTP 200 with the intended release's content and branding. |
| `/practice` and a topic session | HTTP 200; a guest can answer questions and read explanations. |
| `/learn` | HTTP 200; guest progress is visible after a session, and the page remains `noindex`. |
| `/games/pattern-sprint`, `/games/digit-recall` | Both existing games can complete without login. |
| `/api/platform/auth/session` | Session JSON; a guest-only deployment returns HTTP 200 with `configured: false`. |
| `/account` | Optional account controls or an understandable unconfigured state; free practice remains available. |
| `/robots.txt`, `/sitemap.xml` | HTTP 200, correct canonical origin, current public routes and no private workspace/account URLs in the sitemap. |
| Legal pages | Owner-approved details, no unintended placeholders, and indexing consistent with configuration. |

If accounts are enabled, separately complete the live Google and account-data checks in the
backend guide. Check the latest-video cards when configured and the social preview image
(`/og.png`). Verify internal links and an unknown route's 404 behavior.

Once the intended release is live, submit the current sitemap through the site's authorised
Google Search Console property. Keep empty content sections out of indexing until reviewed
material is published. Recheck these results after later deployments rather than relying on an
old screenshot or GitHub status.

## Hosting plan and funding configuration

Before adding advertising or paid features, check the hosting provider's current plan terms and
limits. Vercel's [Hobby plan documentation](https://vercel.com/docs/plans/hobby) restricts that plan
to personal, non-commercial use. The owner chooses the appropriate plan and approves any new
spending commitment before a monetized rollout.

The owner is keeping [`.github/FUNDING.yml`](../.github/FUNDING.yml) for future sponsorship links.
Recipients are not configured yet; add only the owner-selected accounts when ready.
