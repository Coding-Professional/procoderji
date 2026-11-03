# Contributing

Thanks for helping improve ProCoderJii Learning Hub. This guide explains how to set up the
project, check a change and open a pull request.

## Before you start

- Check existing issues and pull requests to avoid duplicate work.
- For a large change, open an issue first so the scope can be discussed.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- For a security vulnerability, use the private reporting instructions in [SECURITY.md](SECURITY.md),
  not a public issue.

## Set up the project

Use Node.js 22.18 or newer and npm:

```bash
git clone https://github.com/procoderji-com/procoderji.git
cd procoderji
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` only if you want to test the optional latest-video section.
The documented values are public; do not add credentials or private tokens to the example file.

## Make a change

- Keep each pull request focused on one problem or feature.
- Use TypeScript and the existing component and utility patterns.
- Keep controls usable with a keyboard and on a phone. Give form fields labels and interactive
  elements visible focus states.
- Add or update a unit test for new data validation or reusable logic.
- Keep study material original. See [docs/content-guide.md](docs/content-guide.md) before adding
  notes, guides or job listings.
- Do not add secrets, private user data, generated build output or unlicensed assets.

## Check your change

Run the checks that match the files you changed:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For route, link and metadata changes, also run `npm run launch-check`. For browser interaction
changes, run `npm run e2e` with Chrome installed. The E2E runner refuses to run if `src/data` or
`src/content` has uncommitted changes because it temporarily installs synthetic fixtures. For
content changes, run `npm test` and `npm run launch-check` instead.

## Open a pull request

1. Create a branch from `main` with a short, descriptive name.
2. Make focused commits with clear messages.
3. Open a pull request against `main` and fill in the provided template.
4. Explain the user-facing change and list the checks you ran. Include screenshots for visual
   changes when useful.
5. Keep the pull request up to date and respond to review feedback.

The maintainer reviews contributions before merging. Opening a pull request does not guarantee
that a proposed feature will be accepted; project scope and maintenance cost are part of review.
