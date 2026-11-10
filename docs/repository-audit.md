# Repository audit — 2026-11-10

This review covers the canonical `procoderji-com/procoderji` repository: public metadata,
contributor guidance, issue and pull-request workflows, branch rules, CI, dependencies,
source boundaries, content safety and deployment documentation. The starting `main` commit
was `7d20d370269f938ee42058f6b9364b4e0351115e`.

The existing Next.js frontend, feature modules, shared rules and .NET backend provide useful
contribution boundaries. A monorepo migration, new contributor agreement or mandatory commit
format is not needed for the current project.

## Findings and changes

| Finding | Action |
| --- | --- |
| About copy still described a notes-only project; repository metadata included unpublished study notes | Describe implemented practice, explanations, games and optional progress accurately. Refresh GitHub About/topics and the website's About page. |
| README omitted database/container CI and merged portfolio validators | Document the actual feature paths and all CI jobs; keep planned public portfolios separate from shipped behavior. |
| No clear support or maintainer workflow | Add [Support](../SUPPORT.md) and the [maintainer guide](maintainer-guide.md), with issue routing, relevant checks and dependency merge order. |
| Main's active ruleset had an empty required-check list and no PR requirement | Require the PR path and the always-running CI checks, preserving deletion/force-push protection and the existing zero mandatory-review count. |
| Vulnerability alerts, security-update PRs and private reporting were disabled | Enable them; retain existing secret scanning, push protection and read-only workflow defaults. |
| Backend packages had no Dependabot version coverage | Add monthly grouped NuGet maintenance alongside npm and Actions, plus security-update groups. |
| Actions used movable version refs and PR dependency changes had no dedicated check | Pin official actions to verified commits and add read-only Dependency review for newly introduced high/critical advisories. |
| Reviewer routing and branch cleanup were implicit | Route requests to the existing `procoder-ji` maintainer with CODEOWNERS and enable deletion of merged repository branches. |
| Deployment guide retained obsolete domain, asset and legal-completion instructions | Use current observations, add transfer/reconnection checks and distinguish repository validation from a deployed service. |

The conditional **Database contracts and container smoke** workflow must not be required for
every pull request: it does not run for unrelated paths. The always-running checks are
**Lint, typecheck, tests and build**, **Browser and SEO checks**, **Backend build and tests**,
and the PR-only **Dependency review** check. Add a new required check only after verifying its
actual name and successful execution.

CODEOWNERS routes requests; it does not establish an independent human review team. Follow
the active GitHub rules and review changes according to their impact.

## Dependency and source review

- Production npm audit: **0 known vulnerabilities** on the review date.
- Full npm audit: **9 moderate findings** in the development-only ESLint/TypeScript-ESLint
  `minimatch` chain. They are documented in [Security notes](security.md); current compatible
  parent ranges do not remove every finding. No blind major override or forced downgrade was applied.
- NuGet API/test projects: **no known vulnerable packages**, including transitive dependencies.
- GitHub reported **0 open secret-scanning alerts**. Existing ignored credential files and
  checked-in environment examples retain their roles.
- Inspected account identity, Origin/CSRF checks, progress isolation, backend proxy allowlists,
  Markdown rejection and filesystem path boundaries had no blocking finding in this review.

The MIT copyright notice and vendored-tool notices remain intact. `package.json` stays
`private: true` to prevent accidental npm publication; this does not change the public repository
or its MIT license. `FUNDING.yml` is retained for the owner to fill with funding links later.

## Engineering follow-ups

- [#72: question-history compatibility](https://github.com/procoderji-com/procoderji/issues/72):
  preserve saved attempts when reviewed questions are corrected or retired.
- [#73: duplicate legacy readers](https://github.com/procoderji-com/procoderji/issues/73):
  retire unreachable implementations while preserving `/courses` redirects and active readers.
- Existing [games](https://github.com/procoderji-com/procoderji/issues/24) and
  [portfolio](https://github.com/procoderji-com/procoderji/issues/40) plans remain separate work.
  Portfolio API [PR #71](https://github.com/procoderji-com/procoderji/pull/71) was open during
  this review; it is not presented here as a public portfolio launch.

## Production observations

On 2026-11-10, HTTPS `/about`, `/robots.txt` and `/sitemap.xml` returned 200. About still had the
old notes-only title, and `/practice`, `/learn` and `/api/platform/auth/session` returned 404,
although those routes exist on canonical main. The latest Production entry recorded by this
repository's GitHub deployments API was dated 2026-11-02. These observations indicate a
deployment gap; they do not establish the precise hosting configuration or running commit.

[#74](https://github.com/procoderji-com/procoderji/issues/74) records the evidence and the
existing-project reconnection/deployment checks. Completing that work needs authorized access
to the existing hosting project. Repository CI, local screenshots and a selected Neon setup
do not prove a successful production rollout. Search Console indexing and real-user Core Web
Vitals were not available for this review.

## Work that needs no repeated owner permission

Within an agreed scope, routine fixes, documentation, tests, accessibility improvements,
issue triage/labels, compatible maintenance, pull-request preparation and routine merges can
proceed through the normal checks and review. Labels are optional for authors. Reuse existing
account, database and product decisions instead of asking for them again.

Owner decisions remain necessary for new legal/licensing terms, public-portfolio age and data
policies, unresolved username/domain choices, pricing/provider selection, spending commitments,
new private credentials/access grants, and changes to the intended visibility or protection policy.
See [ADR 0002](decisions/0002-student-portfolios.md) and the [maintainer guide](maintainer-guide.md).
An independent conduct-report fallback contact should be appointed by the owner rather than invented.

## Validation

Local lint and typecheck passed. Unit tests passed **159 tests**, with **2 Windows symlink
checks skipped**. Full-stack desktop/mobile browser checks reported **0 findings**. The real
production build/link/metadata crawl checked **38 pages** and reported **no problems**.

Rendered About-page captures are available for [desktop](images/about-desktop.png) and
[mobile](images/about-mobile.png); both have one H1, the canonical `/about` URL and no horizontal
overflow. Owner-provided legal metadata remains unchanged.

CI also runs backend tests, provider/container contracts when their paths change, and Dependency review.
Workflow YAML, pinned action refs, relative documentation links and the final GitHub settings
are checked separately. Passing these checks describes repository behavior; use the deployment
guide for production verification.

## Primary references

- [GitHub community profiles](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
- [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Dependency review action](https://github.com/actions/dependency-review-action)
- [Skipped workflows and required checks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
