<div align="center">

<img src="public/brand/procoderji-logo.png" alt="ProCoderJii logo" width="180" />

# ProCoderJii Learning Hub

### A focused learning space for engineering students.

Browse course resources, learn from practical guides, explore career opportunities, and take a short break with free coding games.

[Visit the website](https://procoderji.com) · [Report a bug](https://github.com/Coding-Professional/procoderji/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/Coding-Professional/procoderji/issues/new?template=feature_request.yml)

[![CI](https://github.com/Coding-Professional/procoderji/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Coding-Professional/procoderji/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

</div>

> [!NOTE]
> The course browser is in place, but no course subjects or notes are published yet. Guides and job listings are also awaiting reviewed content. The two games are playable now. See [Current content](#current-content) for details.

## Contents

- [About](#about)
- [Features](#features)
- [Current content](#current-content)
- [Getting started](#getting-started)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Security and privacy](#security-and-privacy)
- [License and attributions](#license-and-attributions)

## About

ProCoderJii is a learning hub for engineering students. The project brings course material, practical learning guides, career listings, and small browser games together in one Next.js website. It is built to make useful, reviewed resources easier to browse and to give contributors a clear path for adding them.

The repository is organized for community contributions: start with the guides below, open an issue to discuss a larger change, and submit a pull request when you are ready.

## Features

- **Course browser:** organize learning material by course, branch, and semester.
- **Games:** Pattern Sprint and Digit Recall are free to play at [`/games`](https://procoderji.com/games). No login is required and scores are not saved between visits.
- **Guides and jobs:** curated sections for practical guides and career opportunities. Only reviewed entries are shown.
- **Optional video cards:** show recent videos from a public YouTube channel feed when configured.
- **Content validation:** validate Markdown and MDX content and prevent unsafe HTML from being rendered.
- **Responsive interface:** browse the site on desktop and mobile.

There are currently no user accounts, database, admin panel, PDF downloads, or chatbot. The contact form opens the visitor's email app; the site does not store submissions.

## Current content

| Section | Status |
| --- | --- |
| Course browser | Course, branch, and semester navigation is available; no subjects or notes are published yet. |
| Games | Pattern Sprint and Digit Recall are playable without an account. |
| Guides | No reviewed guides published yet. |
| Jobs | No reviewed listings published yet. |
| Videos | Optional; requires a public YouTube channel ID. |

Sample files under `src/content` are intentionally not registered as published notes. Please follow the [content guide](docs/content-guide.md) before adding learning material.

## Getting started

### Requirements

- Node.js 22.18 or newer for the full test suite (Node.js 24 is used in CI).
- npm.
- Google Chrome for browser tests. Microsoft Edge can be used with `E2E_CHANNEL=msedge`.

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/Coding-Professional/procoderji.git
cd procoderji
npm ci
npm run dev
```

Open <http://localhost:3000>. The site works without environment variables. To show recent videos locally, copy `.env.example` to `.env.local` and configure the public YouTube channel ID.

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `YOUTUBE_CHANNEL_ID` | No | Enables the latest-video section using the channel's public feed. |
| `NEXT_PUBLIC_SITE_URL` | No | Overrides the canonical site URL, such as for a staging deployment. |

See [deployment documentation](docs/deployment.md) for hosting and environment details. Never commit secrets or personal credentials.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run unit and content validation tests. |
| `npm run build` | Create the production build. |
| `npm run launch-check` | Build and crawl the site, checking links and SEO metadata. |
| `npm run e2e` | Run browser checks in Chrome on desktop and mobile. |

Browser checks use temporary synthetic content and restore their fixtures when they exit. They refuse to run if `src/data` or `src/content` has local changes. The runner and fixtures are documented in [`e2e/run.mjs`](e2e/run.mjs) and the [`e2e/` directory](e2e/).

## Project structure

```text
src/app/          Routes and page layouts (Next.js App Router)
src/components/   Shared UI and page sections
src/content/      Markdown and MDX learning content
src/data/         Course, guide, and job catalogues
src/lib/          Content validation, rendering, SEO, and game logic
e2e/              Browser tests, fixtures, and production crawl checks
docs/             Architecture, content, security, and deployment guides
.github/          CI workflow, issue forms, and pull-request template
.agents/          Optional coding-agent instructions
.claude/          Pointers to canonical agent-tool documentation
seo/              Site-specific search and editorial planning notes
```

For the system overview, read [Architecture](docs/architecture.md). To add or update published notes, read the [Content guide](docs/content-guide.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. For larger changes, open an issue first so the scope can be discussed. Bug reports and feature ideas can use the repository's issue forms.

Contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Submit original learning content or link to official sources; do not copy notes, job descriptions, papers, or images without permission.

## Security and privacy

Please report vulnerabilities using the private reporting instructions in [SECURITY.md](SECURITY.md). The site's data handling is described in its [privacy policy](https://procoderji.com/privacy). For local setup and deployment, see [docs/deployment.md](docs/deployment.md).

## License and attributions

The project is available under the [MIT License](LICENSE). Optional coding-agent tools and their upstream license notices are documented in [docs/agent-tools.md](docs/agent-tools.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The `private` setting in `package.json` prevents publishing this app as an npm package; it does not control GitHub repository visibility.
