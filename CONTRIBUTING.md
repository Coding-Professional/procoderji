# Contributing

Help ProCoderJii become a useful learning and placement-practice platform for students. Code,
documentation, accessibility improvements, original questions, and clear bug reports are welcome.

You can open a pull request for a focused bug fix, documentation correction, test improvement,
or other work within an agreed issue without asking the owner for permission first. Use
[Support](SUPPORT.md) when you need help choosing the right place for a question or report.

## Find a useful change

- Read the [project overview](README.md) and [documentation index](docs/README.md).
- New to the project? Pick an issue labelled
  [good first issue](https://github.com/procoderji-com/procoderji/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22good%20first%20issue%22).
  Each one names the files to change and the checks to run. Issues labelled
  [help wanted](https://github.com/procoderji-com/procoderji/issues?q=is%3Aissue%20is%3Aopen%20label%3A%22help%20wanted%22)
  are larger.
- Check existing [issues](https://github.com/procoderji-com/procoderji/issues) and
  [pull requests](https://github.com/procoderji-com/procoderji/pulls) before starting.
- Discuss larger features, paid features, data collection, or new runtime dependencies in an issue first.
  Include the student problem and the smallest useful outcome.
- Use the practice-question issue form to propose a new exercise. Include the answer,
  explanation, audience, and authorship or source permission.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security vulnerabilities through
  [SECURITY.md](SECURITY.md).

An issue being open does not reserve it for anyone. Leave a short comment when you start work so
contributors can coordinate. Ask for clarification when an acceptance criterion is unclear.
Small fixes do not need a separate issue. Labels help maintainers organise work; contributors do
not need to add labels or request a label before submitting an issue or pull request.

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

Update your local `dev` before starting a new change:

```bash
git fetch upstream
git switch dev
git merge --ff-only upstream/dev
git push origin dev
git switch -c feat/describe-the-change
```

Use a short branch name such as `fix/practice-feedback` or `docs/question-authoring`. If the
fast-forward merge fails, inspect your local commits before deciding how to reconcile the
branches. Do not force-push over work you have not checked.

## Make a focused change

- Keep a pull request about one student problem or contributor improvement.
- Use TypeScript and the existing UI patterns. Keep practice rules and scoring independent of
  React, storage, authentication, and payment providers.
- Put question-practice domain work under `src/features/practice/`; read the
  [boundary decision](docs/decisions/0001-student-product-boundaries.md) before adding adapters.
- Follow the [games plan](https://github.com/procoderji-com/procoderji/issues/24) and
  [shared-game foundation](https://github.com/procoderji-com/procoderji/issues/58) for new games.
  Keep game-result formats separate from the existing multiple-choice progress contract.
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

| Change | Relevant checks |
| --- | --- |
| Documentation only | Review wording, commands and links; runtime tests are unnecessary when behavior is unchanged. |
| Frontend code | `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. |
| Backend code | `dotnet test backend/ProCoderJi.slnx --configuration Release`; persistence changes also need the affected database contracts described in the backend guide. |
| Shared questions or portfolio validation rules | Frontend and backend tests, because both runtimes consume the contract. |
| Routes, metadata, or published learning content | `npm run launch-check`, plus the relevant code or content tests. |
| Browser interactions | `npm run e2e` with Chrome or Edge installed, plus the relevant code checks. |

Browser checks temporarily install synthetic content and refuse to run if `src/data` or
`src/content` has local changes. Content authors should use `npm test` and
`npm run launch-check` while editing those files. List the checks you actually ran and explain
any that could not run; maintainers and CI complete the remaining validation.

## Submit the pull request

```bash
git add <files-you-changed>
git commit -m "Describe the change"
git push -u origin <your-branch-name>
```

Open a pull request from your fork branch to `procoderji-com/procoderji:dev`. Fill in the
template, link a related issue when one exists, explain the resulting behavior, and list the
checks you ran.
Include screenshots for visible UI changes and sources or permissions for learning content.
For interface changes, follow the [design system](design-system/MASTER.md): use the shared
brand, typography, buttons and colour tokens, and check both keyboard and mobile navigation.

`dev` is the integration/staging branch; `main` is production. Feature and dependency changes
go through `dev`. Maintainers promote the canonical `dev` branch to `main` after staging checks;
contributors do not send feature branches directly to `main`. See the
[branch and deployment workflow](docs/branching-and-releases.md).

Respond to review feedback and keep the branch up to date when needed. Maintainers review
student value, correctness, accessibility, and maintenance cost before merging. A proposed
feature may need a smaller scope or further discussion.

The [maintainer guide](docs/maintainer-guide.md) explains routine review, labels, dependency
updates, and decisions that need the project owner's input. Existing owner decisions remain
valid; implementing their agreed scope does not need repeated permission.
