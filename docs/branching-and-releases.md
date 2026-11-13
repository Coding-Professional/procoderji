# Branches and deployments

ProCoderJii uses two long-lived branches:

| Branch | Purpose | Deployment |
| --- | --- | --- |
| `dev` | Default contribution branch; reviewed features and dependency updates integrate here. | Staging, after CI passes. |
| `main` | Reviewed production releases. | Production, after CI passes. |

The flow is `feature/* -> PR -> dev -> staging checks -> PR -> main`. There is no permanent
`release` branch. Version tags can identify releases without creating another integration branch.

## Contributions

Create a feature branch from current `dev` in your fork and open the PR against canonical `dev`.
Both branches reject deletion and force pushes and require PR review and passing checks.
The Branch policy check rejects a feature/fork PR directly into `main`; only this repository's
`dev` branch can be promoted. A fork branch named `dev` is not a production promotion.

Commits and contribution PRs use the contributor account. For the project owner's two-account
workflow, contributions use `Coding-Professional`; reviews and merges use `procoder-ji`.

## Promote a release

1. Make sure `dev` includes current `main`. If production has advanced independently, open a
   `main -> dev` synchronization PR and run checks before testing staging again.
2. Wait for the exact `dev` commit's CI and staging deployment to pass. Exercise the changed
   student journey on staging with sample data. Check migrations, account/portfolio privacy,
   mobile and keyboard behavior when affected.
3. Open a PR from **canonical `dev` to `main`**, describing the behavior being released and
   the staging checks. Review as `procoder-ji` and satisfy all required checks.
4. Use a **merge commit** for this promotion, preserving ancestry between the long-lived
   branches. Squash merges remain suitable for individual feature PRs into `dev`.
5. Production deploys after the new `main` commit passes CI. Confirm the deployment summary,
   health/session checks, canonical redirects and affected public routes.

Do not deploy unreviewed feature commits to production. Urgent fixes follow the same route;
there is no permanent bypass branch. Database schema changes remain deliberate release
operations: test the migrations on staging and apply approved production migrations with the
direct connection before rolling out code that requires them. The runtime keeps migration on
startup disabled. Never use a production database to run browser fixtures.

## Deployment environments

Each GitHub environment has branch restrictions and separate project-scoped deployment tokens.
The CI deployment job runs only on canonical `dev`/`main` pushes, after frontend, browser/SEO
and backend checks pass. PRs and fork workflows receive no deployment credentials.

| Environment | Allowed branch | Frontend project | Backend project |
| --- | --- | --- | --- |
| `staging` | `dev` | `procoderji-dev` | `procoderji-api-dev` |
| `production` | `main` | `procoderji` | `procoderji-api` |

Environment variables: `VERCEL_ORG_ID`, `VERCEL_FRONTEND_PROJECT_ID`,
`VERCEL_BACKEND_PROJECT_ID`, `PUBLIC_ORIGIN`, and `BACKEND_ORIGIN`.
Environment secrets: `VERCEL_FRONTEND_TOKEN` and `VERCEL_BACKEND_TOKEN`. Scope each token to
its project, give it an expiration date and rotate it before expiry. Tokens are never printed
or committed. The script passes them directly to the CLI child process without a shell or
command echo; it never dumps provider output into the workflow logs.
Database and Google credentials stay in the appropriate Vercel project's secret settings.

Staging uses a schema-only Neon branch and a fresh `procoderji_dev` database, with a separate
runtime role. Production student records and Data Protection keys are not copied into it.
Use a separate Google OAuth client with the staging frontend callback. Until configured,
staging supports guest practice and editor previews while account saving is unavailable.

Set `DEPLOYMENT_ENVIRONMENT=staging` in the staging frontend. Staging and Vercel previews send
`noindex, nofollow` and disallow crawling; a dedicated staging project is still a production
*build*, so `NODE_ENV` alone is not an environment boundary. Indexing directives are not access
control. Use sample data and configure hosting access protection when private QA is needed.

The deployment script copies tracked source only. It prepares the backend's service configuration
in an isolated directory, deploys/verifies the API first, then deploys the frontend. The live
summary records the checked source commit and both origins. A failure stops the rollout; inspect
the relevant Vercel project and restore its previous deployment if a rollback is needed.

Each build is created without assigning domains. The pipeline discovers it by its source commit
and unique run metadata, waits for provider readiness, promotes that exact build, and verifies
the project's current production target. A previously rolled-back domain cannot silently keep
serving an older build while the workflow reports success.

Disable a previous independent Git deployment connection after this pipeline has been verified;
otherwise a second deployment path can publish before CI finishes. The canonical GitHub Actions
pipeline does not require granting Vercel's GitHub integration access to an organization.

## Operator recovery

For a manual staging check from a trusted checkout, set the staging project IDs and origins in
the current process, authenticate Vercel CLI, and run
`node scripts/deploy-vercel.mjs --local-staging`. This mode is unavailable in GitHub Actions and
cannot select production. Source files and the operator's existing auth remain separate.

For a production incident, use the hosting dashboard's rollback to the previous verified
deployment, then send the fix through `dev`. Do not delete student records or blindly reverse a
schema migration as part of an application rollback.
