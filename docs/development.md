# Development

Start with [Contributing](../CONTRIBUTING.md) for the fork, branch, and pull-request workflow.
The repository contains a Next.js frontend at the root, a .NET backend under `backend/`, and a
shared practice-question bank. You can develop guest practice without running the backend.

## Frontend setup

Use Node.js **24** and npm. `.nvmrc` and `.node-version` record the supported Node major used in
CI. Install Google Chrome for browser checks; Microsoft Edge is also supported.

From the repository root:

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. No environment file or production credentials are needed for
practice and local progress. Use `npm ci` to reproduce `package-lock.json`; include lockfile
changes when updating a dependency.

## Student flows

| Route | Purpose |
| --- | --- |
| `/learn` | Learner workspace and saved practice progress. |
| `/practice` | Browse placement-practice topics. |
| `/practice/[topic]` | Answer questions and review explanations. |
| `/games` | Existing short reasoning and memory exercises. |
| `/dashboard` | Engineering course catalogue and notes. |
| `/account` | Optional Google sign-in and progress controls when the backend is configured. |

Practice works without login. The current browser retains up to 100 completed attempts; clearing
its site data can remove that history. Account progress is separate from guest history, with an
explicit import action. The account page can export visible history.

## Optional backend and Google accounts

Install the **.NET 10 SDK** and run these commands from the repository root:

```bash
dotnet restore backend/ProCoderJi.slnx
dotnet run --project backend/src/ProCoderJi.Api
```

The development API listens at <http://localhost:5100>. To connect Next.js to it, set this
server-only value in `.env.local` and restart the frontend:

```dotenv
DOTNET_API_URL=http://localhost:5100
```

The browser uses the same-origin `/api/platform/*` endpoints. It does not connect directly to
the backend origin. Keep the backend's `PublicOrigin` configuration aligned with the public
frontend origin, such as `http://localhost:3000` during development.

Configure a Google OAuth client through the backend's local user-secrets store:

```bash
dotnet user-secrets set "Authentication:Google:ClientId" "YOUR-CLIENT-ID" --project backend/src/ProCoderJi.Api
dotnet user-secrets set "Authentication:Google:ClientSecret" "YOUR-CLIENT-SECRET" --project backend/src/ProCoderJi.Api
```

The corresponding environment keys are `Authentication__Google__ClientId` and
`Authentication__Google__ClientSecret`. Register the frontend callback
`http://localhost:3000/api/platform/signin-google` with Google for local development. The Next.js
proxy forwards this callback to the backend. Production needs the exact deployed frontend
origin and callback, not the private API origin.

Google credentials and database connection strings stay in backend user-secrets or the hosting
environment. They do not belong in `NEXT_PUBLIC_` variables or committed configuration. The
backend uses cookie authentication; the session endpoint
`/api/platform/auth/session` returns the current user, configuration status, and an antiforgery
token. Mutating account requests send that token in `X-CSRF-Token`.

The backend uses EF Core with SQLite for local development. A PostgreSQL provider is available
through `Database__Provider=Postgres` and the server-side `ConnectionStrings__Platform` setting.
See [Backend setup](../backend/README.md) for database provisioning, Google configuration, and
production operating requirements.

No payment provider is enabled. Razorpay or Paytm is a later integration decision with separate
billing, entitlement, and operational requirements.

## Frontend environment variables

Copy `.env.example` to `.env.local` only when enabling optional services; `.env.local` is ignored
by Git.

| Variable | Purpose |
| --- | --- |
| `YOUTUBE_CHANNEL_ID` | Optional public channel ID for latest-video cards. |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL override for a staging deployment. |
| `DOTNET_API_URL` | Optional server-only backend origin used by the Next.js proxy. |

## Where to make changes

- `src/app/` connects URLs, metadata, and feature views. Its `/api/platform/*` route forwards
  account traffic through the frontend origin.
- `src/features/practice/` owns practice UI and pure TypeScript scoring/selection rules.
- `src/features/progress/` validates attempt records and coordinates local storage and account
  synchronization.
- `shared/practice/questions.json` is the canonical question bank consumed by the frontend and
  backend. Keep IDs stable when improving wording; use a new ID when a question's meaning changes.
- `shared/portfolio/` holds the student-portfolio rules and test fixtures used by both runtimes
  (see its [README](../shared/portfolio/README.md)); the validators live in
  `src/features/portfolio/` and `backend/src/ProCoderJi.Api/Features/Portfolio/`.
- `backend/src/ProCoderJi.Api/` owns Google sign-in, cookie/antiforgery handling, account progress,
  and EF persistence. Backend tests live under `backend/tests/`.
- `src/content/` and `src/data/` publish reviewed notes, guides, and listings; see the
  [content guide](content-guide.md).

Read [ADR 0001](decisions/0001-student-product-boundaries.md) before changing account, storage,
shared-data, or payment boundaries, and [ADR 0002](decisions/0002-student-portfolios.md) before
working on student portfolios. The [architecture guide](architecture.md) describes the app.

## Checks

| Command | Use it for |
| --- | --- |
| `npm run lint` | Frontend code quality and accessibility lint rules. |
| `npm run typecheck` | TypeScript compatibility. |
| `npm test` | Practice rules, progress model/store, content validation, and helpers. |
| `npm run build` | Production frontend compilation and generated routes. |
| `npm run e2e` | Frontend desktop/mobile browser routes and interactions; optional backend integration is described below. |
| `npm run launch-check` | Real production links, metadata, sitemap, and indexing rules. |
| `dotnet test backend/ProCoderJi.slnx --configuration Release` | Backend integration and validation tests. |

Run checks that exercise the changed behavior. Shared-question changes need both frontend and
backend tests. CI restores and builds the .NET solution before testing it in Release mode.
Backend tests use controlled test authentication; Google credentials and other external secrets
are not required. The live Google callback and production operating setup still need the checks
in [Backend setup](../backend/README.md).

### Browser checks

Browser checks build with temporary catalogue/content fixtures and restore them when finished.
They refuse to run if `src/data` or `src/content` has local changes, so content authors should use
unit/content checks and the production crawl while editing those files. CI retains screenshots
for seven days if the site-quality job fails.

By default, `npm run e2e` checks the frontend without starting the backend. With the .NET 10 SDK
installed, opt into the same full-stack browser mode used by CI:

```bash
E2E_DOTNET=1 npm run e2e
```

In PowerShell:

```powershell
$env:E2E_DOTNET = "1"
npm run e2e
```

This mode builds and starts a real .NET process with an isolated SQLite database, connects the
Next.js proxy, and checks the Google sign-in challenge and public callback URL with test client
configuration. It does not complete external Google consent or token exchange. Those live
provider checks remain part of [Backend setup](../backend/README.md).

To use Edge instead of Chrome:

```bash
E2E_CHANNEL=msedge npm run e2e
```

In PowerShell:

```powershell
$env:E2E_CHANNEL = "msedge"
npm run e2e
```

## Common setup problems

- If Node cannot run the TypeScript tests, check `node --version` and switch to Node 24.
- If backend commands cannot find a compatible SDK, check `dotnet --list-sdks` for .NET 10.
- If a browser is not found, install Chrome or use `E2E_CHANNEL=msedge` for an installed Edge.
- If guest practice works but account sync is unavailable, check the running backend,
  `DOTNET_API_URL`, `PublicOrigin`, and Google settings in the backend guide.
- If a command fails, include its name, relevant error, runtime version, and browser/device in a
  bug report. Remove credentials and personal data from logs before sharing them.
