# Security notes

Last reviewed: 2026-11-10. Public learning content remains file-based. Practice works anonymously
with browser storage; the optional ASP.NET Core backend adds Google sign-in and private progress sync. There are no user
file uploads or live payment processing.

To report a vulnerability privately, follow the repository's [security policy](../SECURITY.md).

## Dependencies

- `npm audit --omit=dev` reported **0 production vulnerabilities** on 2026-11-10.
- The full audit reports nine moderate findings from the existing ESLint toolchain's `minimatch`
  dependency ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)).
  The affected versions predate the account integration. Track a compatible upstream tooling
  update rather than forcing a major override or unrelated ESLint downgrade. Audit findings
  change over time; rerun both commands before a release.
- `playwright-core` (browser tests) is a dev dependency only.

## Accounts and saved progress

- Browser data is validated, bounded to 100 attempts, and scoped separately for each account
  and the guest workspace. Guest imports require an explicit action.
- The browser stores attempts and their cloud-reset generation in one atomic storage envelope.
- The .NET service validates its authentication cookie and compares the expected account ID.
  Same-origin writes, antiforgery tokens, request-size limits, and canonical question validation constrain inputs.
- Google OAuth identifies users by their provider subject, not by matching an email address.
  Google secrets and account cookies remain on the server; no bearer tokens are stored in browser storage.
- Database operations scope every query and update to the authenticated account. Transactional
  writes perform immutable inserts and generation-based resets.
- A reset rotates the generation atomically so stale devices cannot restore deleted history.
  Requests and the database both enforce payload bounds; the database retains 100 recent attempts.
- Private responses are not cached. The Next.js proxy forwards only the learner API routes and required headers.

See [backend setup](../backend/README.md) for Google OAuth, database, and deployment configuration.
Backend integration tests exercise isolation, antiforgery, reset, and retention behavior.
Google consent-screen configuration, exact callback URLs, HTTPS, and hosted cookie behavior
also need verification in the operator's configured deployment. Persist data-protection keys
and secure the database and key material when scaling backend instances.

## Notes and guides (content pipeline)

Notes are written by the owner (and reviewed contributions), but are treated defensively:

| Risk | Protection | Tested in |
| --- | --- | --- |
| Raw `<script>`/`<iframe>`/JSX or `{expressions}` in a note | Rejected at compile time with a clear error (`lib/mdx-safe.ts`); never emitted | `mdx-safe.test.ts`, e2e |
| Text silently disappearing (`{1, 2, 3}`) | Rejected loudly instead of dropped; authoring guide explains backticks, `&lt;`, `\{ \}` | `mdx-safe.test.ts` |
| `javascript:` / `data:` links | Shown as plain text; only http(s), mailto and relative URLs are links | `markdown.test.ts`, e2e |
| Remote images / tracking pixels | Images must be same-site paths from `public/` | `markdown.test.ts` |
| Path traversal in a note path | Resolved inside `src/content` only | `catalog.test.ts` |
| Symlink in `src/content` pointing at e.g. `.env` | Real path must stay inside the real content folder | `safe-path.test.ts` |
| Malformed or hostile structured data (JSON-LD) | `<` is escaped so content cannot close the script tag | `reading.test.ts` |
| Unsafe contact input | Mail header characters stripped, length capped | `contact.test.ts` |

Every `.mdx` file under `src/content` is compiled in the test suite, so an invalid note fails CI
rather than production.

## Third-party requests

The site contacts these hosts from the visitor's browser (the Privacy page names each one, and the
browser tests fail if a new host appears that it does not mention):

| Host | Why | When |
| --- | --- | --- |
| `lottie.host` | About-section animation file | home page |
| `cdn.jsdelivr.net` | the animation player's WebAssembly file | home page |
| `i.ytimg.com` | latest-video thumbnails | only if `YOUTUBE_CHANNEL_ID` is set |
| Google sign-in pages | Google account authorization | when the student chooses Google sign-in |

Self-hosting the player's `.wasm` (it is in `node_modules/@lottiefiles/dotlottie-web/dist`) and the
animation file would remove the first two; check the animation's licence before copying it.

## Content-Security-Policy (not enabled yet)

Baseline headers are enabled in `next.config.ts` (nosniff, frame deny, referrer policy,
permissions policy). Before account integration, a CSP was **trial-run in report-only mode** (nothing blocked) in Chrome over
the home page, dashboard, legal pages and the 404 page at desktop and phone size, with the
YouTube section on. This policy produced **zero violations**:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://i.ytimg.com;
font-src 'self' data:;
connect-src 'self' https://lottie.host https://cdn.jsdelivr.net;
worker-src 'self' blob:;
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Why it is not enforced yet:

- `'unsafe-inline'` for scripts is needed for Next.js's inline bootstrap. A nonce-based policy would
  force every page to render dynamically, losing static and hourly-cached pages.
- Only Chrome was tested (Firefox and Safari handle WebAssembly under CSP slightly differently).
- Google AdSense needs a much larger allow-list (several Google hosts, frames and scripts), so
  the policy should be finalised after the advertising decision, then trialled again with
  `Content-Security-Policy-Report-Only` before enforcing.

Google sign-in uses a top-level redirect; learning API calls stay on the app origin through
the Next.js proxy. Repeat the account flows when evaluating a CSP for the deployed service.

To trial it: add the policy above as a `Content-Security-Policy-Report-Only` header in
`next.config.ts`, run the site, and watch the browser console for "violates the following Content
Security Policy" messages.

## Remaining realistic risks

- A contributor with merge rights could still publish misleading content; review pull requests.
- Links in notes may point to any https site (external links get `noopener noreferrer`).
- The contact form is a `mailto:` link, so spam is handled by the owner's mailbox, not the site.
- Request bounds are not a distributed rate limiter. Configure provider limits and
  infrastructure abuse controls before a public cloud-account rollout. Backend user-secrets
  are for development; use the hosting platform's secret store for Google and database credentials.
