# Contact messages and bot protection

The home-page form sends messages to the ASP.NET Core API through the same-origin Next.js
proxy. A successful response means the message was committed to the database. It does not
send an email or open the visitor's mail app. Google sign-in is not required.

## Configuration

Create a **Managed** widget in [Cloudflare Turnstile](https://dash.cloudflare.com/).
Allow only the frontend hostnames you use, for example `procoderji.com` and
`procoderji-dev.vercel.app`. Use separate widgets/credentials when you need environment isolation.
The widget action is `contact`; the API also checks the hostname against `PublicOrigin`.

| Service | Environment variable | Value |
| --- | --- | --- |
| Next.js | `DOTNET_API_URL` | Trusted backend origin |
| Next.js | `CONTACT_PROXY_KEY` | Random secret, at least 32 characters |
| ASP.NET Core | `Contact__ProxyKey` | Same proxy secret |
| ASP.NET Core | `Contact__TurnstileSiteKey` | Widget's public site key |
| ASP.NET Core | `Contact__TurnstileSecretKey` | Widget's private secret |

Store secrets in your host's encrypted environment configuration or local ignored files.
Never use `NEXT_PUBLIC_` for either secret. `GET /api/platform/contact/config` exposes only
the public site key and availability. Missing keys disable submission; there is no CAPTCHA bypass.
Cloudflare's official dummy keys are rejected by this app. Browser tests inject a fake verifier
only in the separate, loopback-only test executable, never in the published API.

The Next.js proxy uses Vercel's overwritten `x-vercel-forwarded-for` header for the client IP
and authenticates its forwarded address using the shared secret. It ignores browser-supplied
contact headers. Outside Vercel, requests share a loopback rate-limit allowance. If deploying to
another platform, configure a trusted ingress adapter before expecting per-visitor rate limits.

## Persistence and operations

Apply `20261113130000_ContactMessages` using the existing migration procedure before deploying
the API. Test against an isolated database first; Neon migrations use the direct connection,
while the runtime uses the pooled connection. PostgreSQL, SQL Server and SQLite use the EF
migration; MongoDB provisioning creates the contact collection's indexes.

Messages are stored in `ContactMessages` (MongoDB: `contactMessages`). There is deliberately no
public message-reading endpoint. Authorized operators can inspect submissions in their database
console using read-only access. For PostgreSQL, select only what you need:

```sql
SELECT "Id", "CreatedAtUtc", "Name", "Email", "Subject", "Message"
FROM "ContactMessages"
ORDER BY "CreatedAtUtc" DESC
LIMIT 50;
```

`CreatedAtUtc` is Unix time in milliseconds. Treat messages as untrusted plain text; never render
them as raw HTML. Do not paste message contents into CI logs, issues or public screenshots.
Delete messages when they are no longer needed, including verified deletion requests. No automatic
retention period is claimed or implemented.

## Abuse controls and failure behavior

- CAPTCHA tokens are verified server-side at Cloudflare's Siteverify endpoint. Failed, expired,
  wrong-host and wrong-action challenges cannot save a message. Provider failures fail closed.
- A unique SHA-256 token hash prevents concurrent/repeated tokens from creating duplicate messages.
  Raw CAPTCHA tokens and client IP addresses are not stored with the message.
- Each trusted client IP can attempt five submissions per minute per API process; rejected requests
  return `429` with `Retry-After`. Multi-instance hosting still needs provider-level abuse limits or
  a shared limiter. CAPTCHA verification and the unique database constraint remain active on every instance.
- Names, email addresses, subjects, messages and tokens have server-side length bounds; the JSON
  request is limited to 32 KiB. A hidden honeypot catches basic form fillers.
- Validation, security-service and storage failures retain the visitor's text. The browser clears
  fields only after confirmed success and always requires a fresh security check for the next attempt.

See [Cloudflare's validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
and [the privacy policy](../src/app/privacy/page.tsx). If you enforce CSP, allow the Turnstile script
and frames from `https://challenges.cloudflare.com` and re-test the complete form.

## Verification

```bash
dotnet test backend/tests/ProCoderJi.Api.Tests
npm test
npm run lint
npm run build
```

`E2E_DOTNET=1 npm run e2e` additionally tests the real proxy/API/database with a test-only
CAPTCHA provider, including successful storage, failed checks, retry and narrow-screen layout.
It never uses production credentials or sends test messages to the live database.
Set `E2E_CONTACT_ONLY=1` as well to run just the contact browser flows through the same isolated harness.
