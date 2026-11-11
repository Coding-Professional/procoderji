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
| `/learn/portfolio` | Guest preview or signed-in portfolio form, Markdown import, and private drafts. |
| `/u/[username]` | Explicitly published portfolio snapshot when publishing is enabled. |

Practice works without login. The current browser retains up to 100 completed attempts; clearing
its site data can remove that history. Account progress is separate from guest history, with an
explicit import action. The account page can export visible history.

The [portfolio workspace](portfolio-workspace.md) supports Simple and Developer themes and
[Markdown import](portfolio-markdown.md). Guest portfolio details stay in the open page only;
saving/claiming needs a Google session. Publishing is disabled by default. Once an operator
enables it, publication requires a claimed fixed username and explicit 18+ policy acceptance.
Private draft saves do not change an existing public snapshot. Search visibility is opt-in.

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

The backend defaults to SQLite for local development. PostgreSQL (`Postgres`), Microsoft SQL
Server (`SqlServer`), and MongoDB (`MongoDb`) are deployment options selected with
`Database__Provider` and server-only `ConnectionStrings__Platform`; MongoDB also needs
`Database__Name`. The [container guide](containers.md) runs the API and one database together.
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
- `src/features/portfolio/` owns the form, API client, Markdown parser, themes, and public
  delivery. The parser fills the form only; public pages render validated fields, not Markdown.
- `shared/portfolio/` holds rules v2, theme choices, the minimum publishing age/policy version,
  and test fixtures used by both runtimes
  (see its [README](../shared/portfolio/README.md)); the validators live in
  `src/features/portfolio/` and `backend/src/ProCoderJi.Api/Features/Portfolio/`.
  Read the [portfolio API guide](portfolio-api.md) for storage, revisions, request protection and
  the publishing launch setting before changing these endpoints.
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
| `npm test` | Practice/progress, portfolio rules/parser/client/presentation, content validation, and helpers. |
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

This mode builds and starts `backend/tests/ProCoderJi.BrowserHost`, a test-only executable
hosting the real API with disposable SQLite data, and connects the Next.js BFF. The runner owns
the temporary directory, removes external database-test connections, and cleans up its process
and data afterward. Defaults are frontend port 3150 and backend port 5151; use `E2E_PORT` and
`E2E_BACKEND_PORT` to choose distinct alternatives.

BrowserHost enables publishing internally and exposes loopback-only account-seeding,
moderation and publishing-switch fixtures under `/__e2e__`. Its registered disposable-account
cookie is test authentication only; ownership, session, Origin and CSRF checks still run in the
real API. These controls are not Next.js routes and are absent from the production API/image.
Never deploy BrowserHost or substitute it for a development Google account service.

Coverage includes phone/desktop editors and both themes, save/claim/publish, explicit age
confirmation, Markdown import without autosave, private/public snapshot isolation, account
changes, opt-in sitemap/metadata, and fresh 404 responses after moderation/unpublishing even
with a warmed public cache. It also checks the Google challenge and public callback URL using
test client configuration. External Google consent/token exchange remains a live-provider
check in [Backend setup](../backend/README.md).

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
