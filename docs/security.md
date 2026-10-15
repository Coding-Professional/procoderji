# Security notes

Last reviewed: 2026-10-14. This is a static, content-driven site: no accounts, no database, no
user uploads and no server-side secrets.

## Dependencies

- `npm audit --omit=dev` (what ships to production): **0 vulnerabilities**.
- `npm audit` reports 5 high findings, all one advisory chain in the **linter** dependencies
  (`eslint-config-next` -> `@next/eslint-plugin-next` -> `fast-glob` -> `micromatch` -> `braces`;
  GHSA-vfj7-8cjw-p6xm, a denial of service on deeply nested glob patterns). None of it is
  installed in production, and no patched `braces` release exists yet (3.0.3 is the latest).
  Do not run `npm audit fix --force`: it would downgrade `eslint-config-next` to 14.x. Re-check
  after each `eslint-config-next` release.
- `playwright-core` (browser tests) is a dev dependency only.

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

Self-hosting the player's `.wasm` (it is in `node_modules/@lottiefiles/dotlottie-web/dist`) and the
animation file would remove the first two; check the animation's licence before copying it.

## Content-Security-Policy (not enabled yet)

Baseline headers are enabled in `next.config.ts` (nosniff, frame deny, referrer policy,
permissions policy). A CSP was **trial-run in report-only mode** (nothing blocked) in Chrome over
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

To trial it: add the policy above as a `Content-Security-Policy-Report-Only` header in
`next.config.ts`, run the site, and watch the browser console for "violates the following Content
Security Policy" messages.

## Remaining realistic risks

- A contributor with merge rights could still publish misleading content; review pull requests.
- Links in notes may point to any https site (external links get `noopener noreferrer`).
- The contact form is a `mailto:` link, so spam is handled by the owner's mailbox, not the site.
- No rate limiting or WAF is configured here; that is a hosting-level concern.
