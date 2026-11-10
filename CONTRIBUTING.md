# Contributing

Help ProCoderJii become a useful learning and placement-practice platform for students. Code,
documentation, accessibility improvements, original questions, and clear bug reports are welcome.

## Find a useful change

- Read the [project overview](README.md) and [documentation index](docs/README.md).
- Check existing [issues](https://github.com/procoderji-com/procoderji/issues) and
  [pull requests](https://github.com/procoderji-com/procoderji/pulls) before starting.
- Discuss larger features, paid features, data collection, or dependency changes in an issue first.
  Include the student problem and the smallest useful outcome.
- Use the practice-question issue form to propose a new exercise. Include the answer,
  explanation, audience, and authorship or source permission.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security vulnerabilities through
  [SECURITY.md](SECURITY.md).

An issue being open does not reserve it for anyone. Leave a short comment when you start work so
contributors can coordinate. Ask for clarification when an acceptance criterion is unclear.

## Set up your fork

Use Node.js **24** and npm. The version is recorded in `.nvmrc` and `.node-version`. The app can
run locally without production credentials. Backend contributors also need the **.NET 10 SDK**;
see [Development](docs/development.md) and [Backend setup](backend/README.md).

1. Fork [procoderji-com/procoderji](https://github.com/procoderji-com/procoderji) on GitHub.
2. Clone your fork, replacing `YOUR-USERNAME` with your GitHub username:

   ```bash
   git clone https://github.com/YOUR-USERNAME/procoderji.git
   cd procoderji
   git remote add upstream https://github.com/procoderji-com/procoderji.git
   npm ci
   npm run dev
   ```

3. Open <http://localhost:3000>. `origin` is your fork; `upstream` is the original project.

If you already cloned the original project, you can rename that remote to `upstream`, add your
fork as `origin`, and continue from the same checkout.

## Start a branch

Update your local `main` before starting a new change:

```bash
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main
git switch -c feat/describe-the-change
```

Use a short branch name such as `fix/practice-feedback` or `docs/question-authoring`. If the
fast-forward merge fails, inspect your local commits before deciding how to reconcile the
branches. Do not force-push over work you have not checked.

## Make a focused change

- Keep a pull request about one student problem or contributor improvement.
- Use TypeScript and the existing UI patterns. Keep practice rules and scoring independent of
  React, storage, authentication, and payment providers.
- Put new practice-domain work under `src/features/practice/`; read the
  [boundary decision](docs/decisions/0001-student-product-boundaries.md) before adding adapters.
- Add original questions to `shared/practice/questions.json`, the canonical bank consumed by
  both runtimes. Keep the TypeScript and .NET validation behavior consistent when its shape changes.
- Put authentication, account persistence, and future server-owned capabilities under
  `backend/`. The Next.js `/api/platform/*` layer forwards the browser's same-origin requests.
- Keep practice usable on a phone and with a keyboard. Label fields, show focus states, and
  provide useful feedback beyond color alone.
- Add meaningful tests for new scoring, validation, persistence, or access rules. Documentation
  changes do not need tests that simply repeat their text.
- Keep learning material original. Follow the [content guide](docs/content-guide.md) before
  publishing notes, guides, or job listings.
- Keep secrets, private student data, generated output, and unlicensed material out of commits.

Free browser practice remains available without an account. Optional account synchronization
should enhance that experience and degrade clearly when its provider is not configured. New
payment or account requirements need an agreed scope and a documented data flow.

## Check your change

Run the checks relevant to your change; the commands are explained in
[Development](docs/development.md#checks).

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For backend or shared-question changes, also run:

```bash
dotnet test backend/ProCoderJi.slnx --configuration Release
```

For routes, links, or metadata, also run `npm run launch-check`. For browser interactions, run
`npm run e2e` with Chrome installed. Browser checks temporarily install synthetic content and
refuse to run if `src/data` or `src/content` has local changes. For content-only changes, use
`npm test` and `npm run launch-check` instead.

## Submit the pull request

```bash
git add <files-you-changed>
git commit -m "Describe the change"
git push -u origin <your-branch-name>
```

Open a pull request from your fork branch to `procoderji-com/procoderji:main`. Fill in the
template, link the related issue, explain the resulting behavior, and list the checks you ran.
Include screenshots for visible UI changes and sources or permissions for learning content.

Respond to review feedback and keep the branch up to date when needed. Maintainers review
student value, correctness, accessibility, and maintenance cost before merging. A proposed
feature may need a smaller scope or further discussion.
