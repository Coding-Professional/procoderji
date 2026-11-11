# ADR 0002: student portfolios

- **Status:** Accepted for Phase 1 under the owner's delegated implementation decisions; Phase 2 remains future work
- **Date:** 2026-11-11
- **Tracking issue:** [#40](https://github.com/procoderji-com/procoderji/issues/40)

## Context

Students need a simple way to publish a portfolio: who they are, what they know, and what they
have built. Most have no hosting, domain, or time to design a page. ProCoderJii already has
optional Google accounts, an ASP.NET Core backend with EF Core persistence, and a same-origin
`/api/platform/*` layer ([ADR 0001](0001-student-product-boundaries.md)). Portfolios add the
first content that students write and the public reads, so the safety, privacy, and moderation
rules form part of the implementation decision.

Two filling methods were proposed: a form, and a Markdown file the student generates with their
own AI tool. A third option, a fully editable page, was considered and rejected.

## Decision

### One data model, two ways to fill it

A portfolio is a fixed set of fields: name, headline, about, skills, projects (title, link,
technologies, description), education, experience, achievements, and links (GitHub, LinkedIn,
website, email), with a choice of Simple or Developer theme. The editor form and the Markdown
import both produce this model. Markdown is parsed in the browser, with a 50 KiB UTF-8 input
limit. Import only fills in the editor; the student reviews the result and explicitly saves.
The Markdown file itself is never uploaded, stored, or rendered as a page. No AI service is
called by the importer.

Students do not write HTML, CSS, JavaScript, or MDX. Pages are rendered from the model by
themes that the project owns. This excludes student-authored scripts and forms and keeps pages
consistent and readable on a phone. New themes are project contributions, not student content.

### Rules live in one place

Field limits, link rules, username rules, reserved names, blocked words, and the publishing
policy version and minimum age are defined once
under `shared/portfolio/` and consumed by both runtimes, as `shared/practice/questions.json` is.
The TypeScript validator in `src/features/portfolio/` gives immediate feedback in the editor; the
.NET validator in `backend/` is the trusted check. Both run against the same fixtures.

- Links are `https` only. The email field stores a plain address, from which the renderer builds
  a `mailto:` link. Other link schemes are rejected.
- Usernames are 3 to 30 lowercase letters, digits, and single hyphens.
- Reserved names never resolve as portfolios: `www`, `api`, `app`, `admin`, `mail`, `docs`,
  `blog`, `login`, `support`, `help`, `procoderji`, `satyam`, and every existing route segment
  such as `u`, `learn`, `practice`, `account`, `dashboard`, `games`.
- Words that suggest phishing (for example `paytm`, `bank`, `login`, `verify`, `password`) are
  blocked in usernames.

### Address

Phase 1 serves portfolios at `/u/<username>` on the main site. Phase 1 does not require DNS
changes. Public publishing is controlled by backend deployment configuration and remains off
by default; an operator enables it after configuring and verifying the service. Private drafts
can be prepared while publishing is off. The product decisions in this ADR and the portfolio
Privacy and Terms wording are part of Phase 1, tracked in
[#40](https://github.com/procoderji-com/procoderji/issues/40) and
[#48](https://github.com/procoderji-com/procoderji/issues/48).

Phase 2 may add subdomains (`<username>.<domain>`), tracked separately in
[#49](https://github.com/procoderji-com/procoderji/issues/49). The domain, wildcard DNS,
certificates, host rewriting, and canonical redirects need a separate decision and deployment
work. No domain purchase or DNS change is part of Phase 1. The intended boundary is still that
addresses are mapped inside the platform: no record is created per student, and students never
receive DNS, hosting, or provider credentials.

Session and antiforgery cookies stay host-only and scoped to `/api/platform`, as they are today.
A test guards against a future `Domain=.procoderji.com`, which would leak sessions to student
subdomains.

### Ownership and state

- One portfolio per Google account. Guests can try the editor in the browser but must sign in
  to save a private draft, claim a username, or publish. Guest drafts exist only in the open
  page and are cleared on navigation or account changes.
- The username is fixed while the portfolio exists. Ordinary portfolio deletion removes its
  draft, public copy, and claim, so that username becomes available again. A suspended portfolio
  cannot be deleted and recreated through the editor to evade moderation.
- States: **draft** (visible only to the owner), **published** (public), **suspended** (set by
  an operator; returns 404 and cannot be republished until restored). Restoring a suspended
  portfolio returns it to a private draft and clears its published copy and publishing acceptance.
- Publishing creates a separate public snapshot. Saving later draft edits does not change the
  current public page; the student must explicitly publish again. Revision checks prevent a
  stale editor from overwriting another update.
- Search-engine visibility is opt-in. Pages are `noindex` and absent from the sitemap until the
  student chooses it when publishing. A public address can still be read and copied by anyone
  who knows it, and third-party copies cannot be recalled.
- Every public request checks the current publishing state before serving cached portfolio
  data. Unpublishing, deletion, suspension, or disabling the deployment publishing gate returns
  404 on subsequent requests. Writes invalidate cached public data.
- Deleting practice history does not delete a portfolio. Sign-in account deletion and requests
  concerning a suspended portfolio go through the existing operator contact; there is no
  self-service account-deletion endpoint. Account-removal requests include the associated
  portfolio data.

### Personal data

The model has no phone number, postal address, or date of birth. Email is optional and shown
only if the student fills it in; the Google account email is never copied into a public page
automatically. Phase 1 has no photo upload: the page shows an initials avatar and themes make
no third-party image or font requests. Uploads need storage, scanning, and moderation, and are
deferred until a later decision.

Only people aged 18 or older may publish under the Phase 1 product policy. The editor requires
an explicit confirmation of age eligibility and the portfolio Terms and Privacy Policy before
each publish. The backend checks and privately stores the current policy version and confirmation
timestamp. The initial version is `2026-11-11`, defined with the minimum age in
`shared/portfolio/rules.json`. This is self-declaration, not independent age verification or a
parental-consent system. The public Privacy and Terms pages describe these data flows and use
their own `2026-11-11` effective date; unrelated legal pages keep their existing dates.

Students retain ownership of their portfolio material. The operator receives limited permission
to store it and render the chosen published copy to provide the service. The repository's MIT
License does not implicitly license students' portfolio content or personal information.

### Moderation

Every public page has a "Report this page" link that opens an email to the site contact with
the page address filled in. Operators can suspend and restore a portfolio through a documented
procedure in `backend/README.md`. Reports and suspensions are the operator's responsibility,
not an automated system. Prohibited content includes impersonation, phishing or scams,
copyright infringement, and other people's private information. A suspended student can contact
the operator for review or a data-removal request; restoring a draft does not publish it.

### Boundaries

- `src/features/portfolio/`: types, validator, Markdown parser, editor, and theme components.
  Pure rules stay independent of React, storage, and identity.
- `src/app/u/[username]/`: public page and metadata. `src/app/(student)/learn/portfolio/`: editor.
- `backend/`: `Portfolios` table, signed-in endpoints under `/api/platform/portfolio`, a public
  read endpoint for published portfolios, server-side validation, rate limits, and suspension.
- `shared/portfolio/`: rules and fixtures used by both runtimes.

### Rejected: a fully editable page

Free-form HTML or a visual page builder would let a student publish scripts, hidden forms, or
copied designs, would break on phones, and would need a review step for every change. Students
want a good portfolio quickly, not a design tool. Themes give variety without these costs.

## Deferred decisions

- **Phase 2 domain.** Choose whether subdomains use `procoderji.com` or a separate domain and
  verify the selected hosting provider's current wildcard DNS and certificate requirements
  before implementing #49. Phase 1 uses only `/u/<username>`.
- **Later capabilities.** Uploads, username renaming, custom domains, GitHub import, and PDF
  export need separate scope and privacy decisions. Any paid feature still follows ADR 0001.

## Consequences

- Students get a safe, phone-friendly portfolio in minutes without hosting knowledge.
- Themes, the Markdown template, and the parser are approachable contributions; each new theme
  can be a good first issue once the theme system exists.
- The backend gains a second kind of student data with public exposure, so it also gains
  moderation duties, rate limits, and new privacy and terms wording.
- Phase 2 would add DNS and certificate operations and a proxy layer; the canonical-address rule and
  cookie test keep SEO and sessions correct.
- Custom domains, GitHub import, and PDF export (Phase 3) build on the same model and need no
  change to these boundaries. Any paid feature still needs the payment decisions required by
  ADR 0001.
