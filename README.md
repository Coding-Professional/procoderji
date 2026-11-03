<div align="center">

<img src="public/brand/procoderji-logo.png" alt="ProCoderJii logo" width="180" />

# ProCoderJii Learning Hub

### Free learning resources and campus-placement practice for engineering students.

Study, practise reasoning skills, and find practical guidance in one student-focused project.

[Website](https://procoderji.com) · [Roadmap](https://github.com/procoderji-com/procoderji/issues/22) · [Report a bug](https://github.com/procoderji-com/procoderji/issues/new?template=bug_report.yml) · [Request a feature](https://github.com/procoderji-com/procoderji/issues/new?template=feature_request.yml)

[![CI](https://github.com/procoderji-com/procoderji/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/procoderji-com/procoderji/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

</div>

> [!NOTE]
> The course catalogue, guides, and job listings do not yet contain published resources. Pattern Sprint and Digit Recall are playable now. See [current content](#current-content) and the [roadmap](https://github.com/procoderji-com/procoderji/issues/22) for the project direction.

## Contents

- [About](#about)
- [What students can do](#what-students-can-do)
- [Current content](#current-content)
- [Getting started](#getting-started)
- [Commands and CI](#commands-and-ci)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Privacy and safety](#privacy-and-safety)
- [License and attributions](#license-and-attributions)

## About

ProCoderJii is a student-focused learning hub for engineering coursework and campus-placement preparation. The project aims to make useful, reviewed study resources easier to find and give students short, practical ways to practise skills.

The site is built with Next.js, React, TypeScript, Tailwind CSS, and MDX. It is a static content-driven app today: there are no user accounts or database, and game scores are not saved. Content is reviewed and registered in the project catalogues before it appears as a published resource.

## What students can do

- **Browse coursework:** navigate course, branch, and semester pages. A page only becomes searchable when useful, reviewed content is published for it.
- **Practise placement skills:** play Pattern Sprint for number-pattern reasoning and Digit Recall for memory practice at [`/games`](https://procoderji.com/games). These are original practice exercises, not official employer assessments or promises of hiring outcomes.
- **Find practical guidance:** read reviewed study, career, and internship resources when they are published.
- **Use the site without an account:** practice is free, works in a browser, and does not save scores between visits.
- **Contribute:** help improve code, documentation, and original learning material through focused pull requests.

Latest-video cards are optional and use a public YouTube feed when configured. The contact form opens the visitor's email app; the site does not store submissions.

## Current content

| Area | Status |
| --- | --- |
| Course catalogue | Course, branch, and semester navigation exists; no subjects or notes are published yet. |
| Placement practice | Pattern Sprint and Digit Recall are playable without login; the placement-focused roadmap is in progress. |
| Guides | No reviewed guides published yet. |
| Jobs and internships | No reviewed listings published yet. |
| Latest videos | Optional; requires a public YouTube channel ID. |

Sample files under `src/content` are intentionally not registered as published notes. Follow the [content guide](docs/content-guide.md) before adding learning material.

## Getting started

### Requirements

- Node.js 24 (the version used in CI).
- npm, included with Node.js.
- Google Chrome for browser checks; Microsoft Edge can be used locally with `E2E_CHANNEL=msedge`.

```bash
git clone https://github.com/procoderji-com/procoderji.git
cd procoderji
npm ci
npm run dev
```

Open <http://localhost:3000>. The site works without environment variables. To enable latest-video cards locally, copy `.env.example` to `.env.local` and configure the public YouTube channel ID.

| Variable | Required | Purpose |
| --- | --- | --- |
| `YOUTUBE_CHANNEL_ID` | No | Enables the latest-video section using the channel's public feed. |
| `NEXT_PUBLIC_SITE_URL` | No | Overrides the canonical site URL, for example in a staging deployment. |

See [deployment documentation](docs/deployment.md) for hosting details. Never commit secrets or private credentials.

## Commands and CI

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run unit and content-validation tests. |
| `npm run build` | Create the production build. |
| `npm run e2e` | Build with temporary synthetic content and check browser behavior on desktop and mobile. |
| `npm run launch-check` | Build the real site and crawl links, sitemap, metadata, and SEO rules. |

Pull requests run lint, type checks, unit tests, a production build, browser checks, and the production link/SEO crawl. The E2E runner refuses to run when `src/data` or `src/content` has local changes, then restores its fixtures when it exits.

## Project structure

```text
src/app/          Routes, layouts, metadata, sitemap, and robots rules
src/components/   Shared UI and landing-page sections
src/content/      Markdown and MDX learning content
src/data/         Course, guide, and job catalogues
src/lib/          Validation, rendering, SEO, and game logic
e2e/              Browser checks, fixtures, and production crawl
docs/             Architecture, content, security, and deployment guides
.github/          CI, Dependabot, issue forms, and pull-request template
.agents/          Optional coding-agent instructions
.claude/          Pointers to canonical agent-tool documentation
seo/              SEO notes and planning material
```

Start with [Architecture](docs/architecture.md), the [Content guide](docs/content-guide.md), or [Contributing](CONTRIBUTING.md).

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. For larger changes, check existing issues and discuss the scope first. Bug reports and feature requests have dedicated issue forms. Contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Learning material must be original or link to official sources. Do not copy notes, job descriptions, papers, or images without permission. Optional coding-agent tools and their upstream notices are documented in [docs/agent-tools.md](docs/agent-tools.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Privacy and safety

Please report vulnerabilities using the private reporting instructions in [SECURITY.md](SECURITY.md). Read the site's [privacy policy](https://procoderji.com/privacy) for information about data handling.

## License and attributions

The project is available under the [MIT License](LICENSE). Vendored agent tools retain their separate upstream notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
