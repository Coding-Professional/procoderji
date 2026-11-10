# ADR 0002: student portfolios

- **Status:** Proposed; open questions below need the owner's decision before Phase 1 ships
- **Date:** 2026-11-10
- **Tracking issue:** [#40](https://github.com/procoderji-com/procoderji/issues/40)

## Context

Students need a simple way to publish a portfolio: who they are, what they know, and what they
have built. Most have no hosting, domain, or time to design a page. ProCoderJii already has
optional Google accounts, an ASP.NET Core backend with EF Core persistence, and a same-origin
`/api/platform/*` layer ([ADR 0001](0001-student-product-boundaries.md)). Portfolios add the
first content that students write and the public reads, so the safety, privacy, and moderation
rules must be settled before the code.

Two filling methods were proposed: a form, and a Markdown file the student generates with their
own AI tool. A third option, a fully editable page, was considered and rejected.

## Decision

### One data model, two ways to fill it

A portfolio is a fixed set of fields: name, headline, about, skills, projects (title, link,
technologies, description), education, experience, achievements, and links (GitHub, LinkedIn,
website, email). The editor form and the Markdown import both produce this model. The Markdown
import only fills in the editor; the student reviews the result and saves. The Markdown file is
never rendered as a page.

Students do not write HTML, CSS, JavaScript, or MDX. Pages are rendered from the model by
themes that the project owns. This keeps pages safe (no injected scripts or phishing forms),
consistent, and readable on a phone. New themes are project contributions, not student content.

### Rules live in one place

Field limits, link rules, username rules, reserved names, and blocked words are defined once
under `shared/portfolio/` and consumed by both runtimes, as `shared/practice/questions.json` is.
The TypeScript validator in `src/features/portfolio/` gives immediate feedback in the editor; the
.NET validator in `backend/` is the trusted check. Both run against the same fixtures.

- Links are `https` only, plus `mailto:` for the email field. Other schemes are rejected.
- Usernames are 3 to 30 lowercase letters, digits, and single hyphens.
- Reserved names never resolve as portfolios: `www`, `api`, `app`, `admin`, `mail`, `docs`,
  `blog`, `login`, `support`, `help`, `procoderji`, `satyam`, and every existing route segment
  such as `u`, `learn`, `practice`, `account`, `dashboard`, `games`.
- Words that suggest phishing (for example `paytm`, `bank`, `login`, `verify`, `password`) are
  blocked in usernames.

### Address

Phase 1 serves portfolios at `/u/<username>` on the main site. Phase 1 does not require DNS
changes. Public launch still needs the backend, moderation, and owner and legal decisions tracked
in [#40](https://github.com/procoderji-com/procoderji/issues/40).

Phase 2 adds subdomains (`<username>.<domain>`). A wildcard DNS record points at the frontend,
and `src/proxy.ts` rewrites the host to `/u/<username>`. Addresses are mapped inside the
platform: no record is created per student, and students never receive DNS, hosting, or
provider credentials. One address is canonical and the other redirects to it.

Session and antiforgery cookies stay host-only and scoped to `/api/platform`, as they are today.
A test guards against a future `Domain=.procoderji.com`, which would leak sessions to student
subdomains.

### Ownership and state

- One portfolio per Google account. Guests can try the editor in the browser but must sign in
  to claim a username and publish.
- States: **draft** (visible only to the owner), **published** (public), **suspended** (set by
  an operator; returns 404 and cannot be republished until restored).
- Search-engine visibility is opt-in. Pages are `noindex` and absent from the sitemap until the
  student turns it on.
- Deleting the account deletes the portfolio.

### Personal data

The model has no phone number and no postal address. Email is optional and shown only if the
student fills it in. Phase 1 has no photo upload: the page shows an initials avatar. Uploads need
storage, scanning, and moderation, and are deferred until a later decision.

### Moderation

Every public page has a "Report this page" link that opens an email to the site contact with
the page address filled in. Operators can suspend and restore a portfolio through a documented
procedure in `backend/README.md`. Reports and suspensions are the operator's responsibility,
not an automated system.

### Boundaries

- `src/features/portfolio/`: types, validator, Markdown parser, editor, and theme components.
  Pure rules stay independent of React, storage, and identity.
- `src/app/u/[username]/`: public page and metadata. `src/app/learn/portfolio/`: editor.
- `backend/`: `Portfolios` table, signed-in endpoints under `/api/platform/portfolio`, a public
  read endpoint for published portfolios, server-side validation, rate limits, and suspension.
- `shared/portfolio/`: rules and fixtures used by both runtimes.

### Rejected: a fully editable page

Free-form HTML or a visual page builder would let a student publish scripts, hidden forms, or
copied designs, would break on phones, and would need a review step for every change. Students
want a good portfolio quickly, not a design tool. Themes give variety without these costs.

## Open questions for the owner

1. **Age requirement.** Section 9 of India's Digital Personal Data Protection Act, 2023 will
   require verifiable parental consent before processing a child's personal data. The DPDP
   Rules, 2025 were notified on 13 November 2025 (MeitY, G.S.R. 843(E)), and Section 9 is
   scheduled to commence 18 months after that date, so it is not yet in force on this ADR's
   date. Separately from the statutory timeline, the proposed product policy is that only
   students aged 18 or older may publish a public portfolio, with a confirmation step in the
   editor. Confirm this policy, or choose another rule after legal advice.
2. **Username changes.** Should a username be changeable after publishing? Allowing it breaks
   shared links; forbidding it needs a clear notice before the first publish.
3. **Phase 2 domain.** Serve subdomains under `procoderji.com`, or buy a separate domain for
   student pages (as GitHub uses `github.io`)? A separate domain protects the main site's
   reputation if a page is abused. Wildcard certificates on Vercel need
   [Vercel nameservers](https://vercel.com/guides/why-use-domain-nameservers-method-wildcard-domains),
   or the documented alternative of delegating the `_acme-challenge` record to Vercel DNS with
   `NS` records while keeping the current nameservers
   ([Vercel guide](https://vercel.com/kb/guide/wildcard-domain-without-vercel-nameservers)).
4. **Legal text.** The Privacy and Terms pages need new sections (issue #48). The owner reviews
   and approves the wording; no placeholder legal text is published.

## Consequences

- Students get a safe, phone-friendly portfolio in minutes without hosting knowledge.
- Themes, the Markdown template, and the parser are approachable contributions; each new theme
  can be a good first issue once the theme system exists.
- The backend gains a second kind of student data with public exposure, so it also gains
  moderation duties, rate limits, and new privacy and terms wording.
- Phase 2 adds DNS and certificate operations and a proxy layer; the canonical-address rule and
  cookie test keep SEO and sessions correct.
- Custom domains, GitHub import, and PDF export (Phase 3) build on the same model and need no
  change to these boundaries. Any paid feature still needs the payment decisions required by
  ADR 0001.
