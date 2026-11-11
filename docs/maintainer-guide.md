# Maintainer guide

Use this guide with [Contributing](../CONTRIBUTING.md), the [Code of Conduct](../CODE_OF_CONDUCT.md)
and [Security policy](../SECURITY.md). Repository access and the active GitHub branch rules
determine who can merge.

[CODEOWNERS](../.github/CODEOWNERS) routes review requests to the project account,
[`procoder-ji`](https://github.com/procoder-ji). It does not grant repository access; the active
branch rules determine whether an approval is required.

## Work that can proceed without another owner decision

Contributors can investigate and prepare focused fixes, documentation, tests, accessibility
improvements and work within an agreed issue. Maintainers can triage reports, apply labels,
organise existing issues and prepare pull requests. Routine dependency fixes can proceed when
their compatibility and behavior are understood.

These steps do not need repeated owner permission. Existing decisions, including the .NET
backend and selected Neon PostgreSQL deployment, remain valid. A person implementing that
approved scope should continue through a reviewable change and its relevant checks.

Use the pull-request workflow for changes to `main`, and satisfy the repository's active review
and status-check rules before merging. Maintainers can merge routine changes within their
authorised scope once the relevant checks and review are complete. Production rollout and
private-credential access follow the separately agreed operating scope.

## Decisions to take to the owner

Prepare the proposed change and explain its impact before asking for a decision. Continue
unrelated work while a decision is pending. Owner input is needed for changes such as:

- Legal wording, licensing terms, public-data policies and the portfolio age requirement.
- New pricing, paid access, payment providers, funding recipients or spending commitments.
- New production credentials, external account enrolment, DNS/domain changes or a production
  data migration that affects existing students.
- Repository visibility, access grants, or changes to the intended branch-protection policy.
- Unresolved product boundaries, such as portfolio username changes and the public-page domain.

Check the existing issue, session instruction or architecture decision first. Do not ask again
for an action already authorised within the same scope. Record durable product/architecture
decisions in an ADR; the open portfolio decisions remain in
[ADR 0002](decisions/0002-student-portfolios.md).

## Triage issues

1. Search for an existing issue or pull request, reproduce a bug where possible, and confirm
   that a request fits the student product. Link related work instead of duplicating it.
2. Ask for the smallest missing detail that prevents useful work. Keep secrets, private data
   and vulnerability reproduction details out of public issues.
3. State a useful scope and observable acceptance criteria. Link dependencies and the relevant
   code/docs so contributors can start without guessing.
4. Apply the labels that help. Labels are maintained by the project and are optional for authors;
   their absence does not make a report or pull request invalid.

Use `bug`, `documentation`, `enhancement` and `dependencies` for the type of work, and `games` or
`portfolio` for those feature areas. `help wanted` invites contributions. Use `good first issue`
for a small, self-contained task with clear starting files and checks, rather than an unresolved
architecture or security change.

An open issue does not reserve the task. A short starting comment and a linked pull request
help people coordinate. When closing an issue, explain the outcome or link the fix; do not
silently close useful reports just because they have been quiet.

## Review pull requests

- Confirm the actual problem, final scope and resulting behavior. Check for overlap with open
  work and for changes that need a recorded product decision.
- Check correctness, student usefulness, account/data boundaries, accessibility and maintenance
  cost. Review original question answers and explanations, not only whether JSON parses.
- Require meaningful tests for changed scoring, validation, persistence and access rules.
  Documentation-only edits need accurate wording and working links, not tests that mirror prose.
- Check the relevant frontend/backend/shared-data contracts. Persistence work must pass the
  affected provider contracts; browser behavior needs appropriate browser checks.
- Preserve licences and third-party notices. Remove secrets, generated output and unrelated edits.
- Keep the title and description about the final change. A short description is enough for a
  simple fix if it explains the outcome and relevant validation.
- Resolve review findings and check the final commit's CI before merging. A green build does
  not replace reviewing the actual change. Update the branch when base changes make checks stale.

Describe human and automated reviews accurately. Request manual review when a change's impact
needs another maintainer's judgement, and follow any review requirement in the active branch rules.

The database/container workflow runs only when its configured paths change. Keep the required
checks for every pull request aligned with checks that always run; a conditional workflow must
not leave unrelated pull requests waiting for a check that will never be reported. The
pull-request Dependency review check inspects newly introduced high/critical vulnerabilities;
it complements the dependency audits in the security guide.

## Handle dependency pull requests

Dependabot branches are normal maintenance work. Review updates by impact rather than by PR
number or the order branches appear:

1. Assess security fixes first, considering production exposure and the advisory's impact.
2. Review compatible grouped patch/minor updates, checking manifests, lockfiles, peer dependencies
   and relevant CI. Review runtime and development changes according to what they affect.
3. Handle major or breaking updates separately, with release notes and a migration plan. Resolve
   an existing compatibility issue before merging the dependent major update.

Merge one overlapping dependency change at a time. Let remaining branches refresh, then recheck
their current diff and CI. Close a superseded update only after confirming that its changes are
already included. Keep security updates visible; fewer routine PRs should not hide an urgent fix.

For NuGet updates, refresh the complete solution with
`dotnet restore backend/ProCoderJi.slnx --force-evaluate`, then verify
`dotnet restore backend/ProCoderJi.slnx --locked-mode`. API or test dependencies also affect
referencing projects, including `backend/tests/ProCoderJi.BrowserHost/`. Commit every changed
`packages.lock.json` so clean CI restores use the same graph. Check the collector's required
Test SDK version when updating Coverlet, and verify that CI records executed API lines.

Follow [Security notes](security.md) for current known findings. Do not use `npm audit fix --force`,
unrelated downgrades or broad overrides just to obtain a clean summary. New runtime dependencies
need a concrete use and a discussion of their maintenance cost.

## Publish and operate

The current security-support target is `main`; no versioned release or long-term support schedule
is promised. Deployment remains an operator step using the [deployment](deployment.md),
[container](containers.md) and [Neon](neon.md) guides.

Describe merged, locally tested and production-verified behavior accurately. A selected hosting
provider or a passing test does not establish that a live account service has been deployed.
Keep portfolio publishing, paid access and other launch-sensitive capabilities gated until
their documented owner decisions and operating requirements are complete.
