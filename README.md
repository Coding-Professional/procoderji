# ProCoderJii Learning Hub

A learning site for engineering students. It brings together course notes, guides, career
listings and short browser-based practice games in one place.

> **Current content status:** the course browser is ready, but the notes catalogue has no
> published subjects yet. The sample files under `src/content` are intentionally unregistered.
> Guides and job listings are also empty until reviewed content is added.

## What is included

- A Next.js site for browsing course notes by course, branch and semester.
- A content pipeline that validates Markdown notes and keeps unsafe HTML out of published pages.
- Two free games at `/games`: Pattern Sprint and Digit Recall. They need no account and do not
  save scores between visits.
- Optional latest-video cards using the channel's public YouTube feed.
- Hand-curated guides and job listings, shown only when reviewed items are available.

There are no accounts, database, admin panel, PDF downloads or chatbot. The contact form opens
the visitor's email app; the site does not store contact submissions.

The site uses Next.js 16, React 19, TypeScript, Tailwind CSS 4 and MDX. The `private` flag in
`package.json` prevents npm package publishing; it does not set GitHub repository visibility.

## Run locally

### Requirements

- Node.js 22.18 or newer for the full test suite; Node.js 24 is also supported.
- npm. The repository commits `package-lock.json`, so use `npm ci`.

```bash
git clone https://github.com/Coding-Professional/procoderji.git
cd procoderji
npm ci
npm run dev
```

Open <http://localhost:3000>. To enable the latest-video section locally, copy `.env.example`
to `.env.local`; its example channel ID is public and no API key is needed. The app also works
without this setting.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Check code style and common mistakes |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run unit and content validation tests |
| `npm run build` | Create the production build |
| `npm run launch-check` | Build and crawl the real site, checking links and SEO metadata |
| `npm run e2e` | Run browser checks in Chrome on desktop and mobile |

The unit tests and browser tests need Node.js 22.18 or newer. Browser tests also need Google
Chrome installed; use `E2E_CHANNEL=msedge` if you have Microsoft Edge instead. The E2E runner
uses temporary synthetic content, refuses to run when `src/data` or `src/content` has local
changes, and restores its fixtures when it exits.

## Where things live

```text
src/app/          Routes and page layouts (Next.js App Router)
src/components/   Shared UI and landing-page sections
src/content/      Markdown and MDX content
src/data/         Course, guide and job catalogues
src/lib/          Catalogues, validation, rendering, SEO and game logic
docs/             Architecture, content, security and deployment guides
e2e/              Browser tests, test fixtures and production crawl checks
.github/          CI, issue forms and pull-request templates
.agents/          Optional SEO and UI/UX instructions for coding agents
.claude/          Pointers to the canonical agent skill copies
seo/              Site-specific search and editorial planning notes
```

Read [the architecture guide](docs/architecture.md) for how routes, data and content fit
together. To publish notes, see [the content guide](docs/content-guide.md).

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the
[Code of Conduct](CODE_OF_CONDUCT.md), and use the issue forms for bugs or ideas. Please submit
original learning content or link to official sources; do not copy notes, job descriptions,
papers or images without permission.

For security issues, see [SECURITY.md](SECURITY.md). Deployment and environment configuration
are documented in [docs/deployment.md](docs/deployment.md).

The optional coding-agent tools and their upstream notices are explained in
[docs/agent-tools.md](docs/agent-tools.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

The project is licensed under the [MIT License](LICENSE). Vendored agent tools retain their
separate upstream notices; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
