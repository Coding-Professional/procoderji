# ADR 0001: student-product boundaries

- **Status:** Accepted for the current implementation
- **Date:** 2026-11-10

## Context

The next useful student workflow is a placement-practice loop: choose a topic, answer questions,
understand explanations, and see progress. Optional accounts use an ASP.NET Core service with
Google sign-in. Contributors need clear places to improve learning content,
frontend behavior, or account persistence without coupling them together.

## Decision

Keep the Next.js frontend at the repository root and add a .NET 10 solution under `backend/`.
Share original question data through `shared/practice/questions.json`; both runtimes validate
against that bank.

- **Frontend routes (`src/app/`):** connect URL, metadata, and feature views. The
  `/api/platform/*` forwarding layer keeps browser account requests under the public frontend
  origin and uses the server-only `DOTNET_API_URL` configuration.
- **Practice feature (`src/features/practice/`):** own TypeScript question selection, answer
  evaluation, recommendations, and views. Pure domain code stays independent of React, browser
  storage, identity, and payment SDKs.
- **Browser progress (`src/features/progress/`):** validate attempt records, scope local history
  to the guest or signed-in account, and coordinate optional sync. Guest practice remains usable
  without backend configuration.
- **Backend (`backend/`):** own Google sign-in, authenticated cookie sessions, antiforgery
  protection, account persistence, and trusted data validation. Use EF Core with SQLite for
  local development and a PostgreSQL option for configured deployments.
- **Shared questions (`shared/practice/`):** maintain one canonical question set. Changes to its
  contract require tests in both runtimes.
- **Content pipeline:** retain reviewed catalogue and Markdown publishing for course resources,
  guides, and listings.

Use `/practice` for topic discovery, `/practice/[topic]` for sessions, and `/learn` for the
learner workspace. `/account` provides optional Google account controls. Existing `/dashboard`
course notes and `/games` exercises retain their responsibilities.

The browser requests session state through `/api/platform/auth/session` and sends its
antiforgery token in `X-CSRF-Token` for mutations. Google credentials stay on the backend. The
public callback `/api/platform/signin-google` is forwarded to ASP.NET Core; `PublicOrigin`
records the frontend origin. Student access comes from authenticated identity rather than a
browser-supplied account ID alone.

## Current delivery and future payments

This implementation delivers practice, explanations, browser-saved progress, a learner
workspace, and a backend foundation for Google accounts and synchronized progress. Configured
operators must verify live sign-in and deployment behavior. It does not enable paid plans or
live checkout.

Razorpay or Paytm is a future provider decision. Billing also requires a defined product offer,
server-verified payment state, trustworthy entitlements, cancellation/support behavior, and
operational readiness. A client-side flag or UI label is not proof of payment. Do not add a
simulated checkout that suggests a student has purchased a real service.

## Consequences

- Students can use free practice and browser progress before creating an account.
- Frontend contributors can work without .NET or Google credentials; backend contributors have
  a focused solution and test suite.
- Both runtimes agree on the question source and must preserve compatible data contracts.
- Hosting the account service adds API, database, secrets, and operational responsibilities.
- Browser-only progress has device/browser limits; optional accounts add synchronization.
- A feature does not need a new package or service unless a concrete consumer or independent
  deployment requirement justifies it.

Changes to account requirements, shared-data contracts, paid access, or runtime boundaries
should be recorded in a later decision and reflected in the development and architecture guides.
