# Student portfolio workspace

Phase 1 lets students prepare a portfolio at `/learn/portfolio` and explicitly publish a copy
at `/u/<username>`. It is free; billing and paid entitlements are future work. These repository
capabilities do not establish production deployment.
[Issue #74](https://github.com/procoderji-com/procoderji/issues/74) tracks outstanding frontend
hosting work.

## Student journey

1. Try the editor and live preview as a guest. Details exist only in the open page, with no
   portfolio storage in localStorage; leaving or changing accounts clears them.
2. Sign in with Google to save a private draft. Fill name, headline, about, skills, projects,
   education, experience, achievements and optional links/public email. Lists can be added,
   removed and reordered. Choose Simple or Developer; both themes render the same fields.
3. Optionally [import Markdown](portfolio-markdown.md) using the
   [template](../public/templates/portfolio.md). The browser parses up to 50 KiB of UTF-8 text.
   Import fills the form for review; it does not upload the source file, call an AI service,
   save a draft or publish.
4. Save, check availability and claim a username. It stays fixed while the portfolio exists;
   deleting an ordinary portfolio releases it.
5. Review the preview and public fields. Publishing requires a name/headline, an address, and
   explicit confirmation that the student is at least 18 and has read the Terms and Privacy
   Policy. No birth date is collected. The backend privately records policy version
   `2026-11-11` and the server confirmation time.
6. Publish when the deployment enables it. Later draft saves remain private until publishing
   again. Search indexing is off by default; it changes only with the published copy. A
   `noindex` page can still be opened by anyone with its address.
7. Unpublish to remove the public copy while keeping the draft, or delete the portfolio and
   its address. A suspended portfolio can be edited/unpublished, but cannot publish or delete
   until operator review. Restore returns a draft; the student must publish again.

Inline validation explains field errors. Revision conflicts preserve local edits; explicit
reload asks for confirmation before replacing unsaved work. Account changes clear private
editor state. Google email is never automatically published: the optional public email must be
filled by the student. Themes use initials and make no third-party image/font requests; there
are no photos, student scripts or custom forms.

Every public page links to policies and **Report this page**, a mailto to the fixed project
contact with the canonical page address. Operators handle reports and account-removal requests;
practice-history deletion is separate from portfolio deletion. See
[moderation](../backend/README.md#portfolio-moderation).

## Deployment runbook

Backend `Portfolio__PublishingEnabled=false` is the default. Draft editing can be enabled first.
To prepare a real release:

1. Deploy Next.js and the production .NET API as separate services. Frontend server-only
   `DOTNET_API_URL` must reach the API; backend `PublicOrigin` must match the exact HTTPS
   frontend origin. Deploy the production API project/image, never BrowserHost.
2. Configure the real Google OAuth web client and frontend callback. Complete the live
   session/sign-in/CSRF checks in [backend setup](../backend/README.md); fixtures do not test
   external Google consent or token exchange.
3. Provision durable storage and Data Protection keys. Neon PostgreSQL is the selected hosted
   option; use its direct migration and pooled runtime connections from [Neon setup](neon.md).
   Apply migrations before starting replicas and verify backup/restore.
4. Verify deployed policy text, operator/contact details, reporting and moderator access.
   Product decisions and policy wording do not establish qualified legal review. Confirm
   monitoring, HTTPS, infrastructure rate limits and database access restrictions.
5. Run repository checks and inspect the deployed commit/routes. Exercise private drafts,
   fixed claims, accepted-policy publication, default `noindex`, opt-in metadata/sitemap,
   draft/public isolation, unpublish/delete, and suspend/restore followed by republishing.
6. Set backend `Portfolio__PublishingEnabled=true` and roll out the configured release. Check
   both themes on phone/desktop and verify withdrawn pages return 404 even after a warmed
   cache. Disabling the flag hides pages and empties the portfolio index without deleting
   drafts; enable it again after resolving the problem.

The sitemap supports up to 45,000 opted-in portfolio entries; partition it before exceeding
that cap. Phase 1 uses paths on the main site and needs no wildcard DNS or per-student hosting.
Subdomains, uploads, custom domains and monetization require separate work.

## Contributor entry points

| Area | Source or guide |
| --- | --- |
| Editor and account adapter | `src/features/portfolio/editor/`, `src/features/portfolio/client.ts` |
| Themes and public page | `src/features/portfolio/themes/`, `src/app/u/[username]/` |
| Markdown parser and format | [Import guide](portfolio-markdown.md), `src/features/portfolio/markdown.ts` |
| Shared validation and publishing policy | [Rules v2](../shared/portfolio/README.md) |
| Revisions, state/index endpoints and caching | [Portfolio API](portfolio-api.md) |
| Test-only full-stack host | [Browser checks](development.md#browser-checks) |
| Product boundaries | [ADR 0002](decisions/0002-student-portfolios.md) |
