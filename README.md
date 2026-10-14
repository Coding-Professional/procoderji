# ProCoderJii Notes

A small Next.js site that goes with the ProCoderJii YouTube channel. Visitors pick a
branch and semester and read unit-wise notes online.

> **Status:** the browsing structure (B.Tech → CSE / AIML → Semesters 1-8) is in place,
> but no subjects or notes are published yet. Empty semesters show a "Notes coming soon"
> page. The sample MDX files under `src/content` are placeholders and are
> intentionally **not** registered in the catalogue.

## What it is (and is not)

- A statically-built reading site: Next.js App Router, React 19, Tailwind CSS 4,
  Framer Motion, `next-mdx-remote` for rendering notes.
- Content lives in the repository (MDX files + `src/data/courses.json`).
- There is **no database, no user accounts, no admin panel, no PDF downloads, no search
  and no chatbot.** Older versions of this README described those; they do not exist.
- The contact form opens the visitor's email app with a pre-filled message to the team
  address. Nothing is stored or sent by the server.

## Requirements

- Node.js **20.9 or newer** to run and build the site (required by Next.js 16).
- Node.js **22.18 or newer** (24 recommended) to run `npm test`, `npm run e2e` and
  `npm run launch-check`: the tests import TypeScript directly through Node's built-in type
  stripping, which older versions do not have.
- npm (a `package-lock.json` is committed; use `npm ci`).

## Getting started

```bash
npm ci
npm run dev        # http://localhost:3000
```

### Scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the dev server                                 |
| `npm run build`     | Production build                                     |
| `npm start`         | Serve the production build                           |
| `npm run lint`      | ESLint                                               |
| `npm run typecheck` | TypeScript (`tsc --noEmit`)                          |
| `npm test`          | Unit tests (Node's built-in test runner, no extra deps) |
| `npm run e2e`       | Browser tests in real Chrome (desktop + mobile); see below |
| `npm run launch-check` | Builds the real site and crawls it: links, anchors, sitemap, robots, canonicals, noindex rules |

Run `npm run lint && npm run typecheck && npm test && npm run build` before opening a PR.

**Browser tests (`npm run e2e`)** build the site with temporary *synthetic* notes, guides and jobs,
drive Google Chrome (`E2E_CHANNEL=msedge` for Edge) over every page at desktop and phone size, check
navigation, menus, forms, 404s, heading structure, landmarks, accessible names, overflow, SEO tags
and that hostile note content is neutralised, then restore your data. It refuses to run if
`src/data` or `src/content` has uncommitted changes, so it cannot overwrite real content.

### Configuration

| Variable               | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin. Optional; defaults to `https://procoderji.com`.  |
| `YOUTUBE_CHANNEL_ID`   | Public channel id for the "Latest videos" section. Optional; the section is hidden while unset. See `.env.example`. |

The primary domain is `https://procoderji.com`. Canonical links, Open Graph URLs,
`sitemap.xml` and `robots.txt` all use it. Set `NEXT_PUBLIC_SITE_URL` only to override
it (for example on a staging build) in your hosting provider's environment settings or a
local, git-ignored `.env.local`. An unset or malformed value falls back to the default.
The value is inlined at build time, so redeploy after changing it.

**Launching?** See [docs/deployment.md](docs/deployment.md) for the exact manual steps: environment
variables, making the apex domain primary and redirecting `www` to it, completing the legal pages, and
the post-deploy checklist.

## Adding notes

Notes are Markdown files registered in `src/data/courses.json`. Each registered unit gets
its own indexable page at `/dashboard/<course>/<branch>/<semester>/<subject>/<unit>`, with
breadcrumbs, previous/next links, reading time, an optional "updated" date and structured
data. Only publish reviewed, original content, and never register placeholders.

See **[docs/content-guide.md](docs/content-guide.md)** for the catalogue fields, the rules
for notes (Markdown only: raw HTML/JSX, expressions and imports are removed for safety) and
the checks to run.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # landing page
│   ├── dashboard/            # reader: branch → semester → subject → ?note=unit
│   ├── courses/              # plain duplicate reader (noindex)
│   ├── robots.ts, sitemap.ts # use the site URL + the catalogue
├── components/               # landing sections, sidebar, cards, empty state
├── content/                  # note files (only placeholders for now, not registered)
├── data/courses.json         # catalogue: the single source of truth
└── lib/                      # catalogue helpers, markdown parser, mailto, SEO (tested)
```

## Contributing

Issues and pull requests are welcome. Keep changes focused, add or update a test where
practical, and don't add placeholder or invented study content.

## License

MIT - see [LICENSE](LICENSE).
