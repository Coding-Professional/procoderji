# ProCoderJii Notes

A small Next.js site that goes with the ProCoderJii YouTube channel. Visitors pick a
branch and semester and read unit-wise notes online.

> **Status:** the browsing structure (B.Tech → CSE / AIML → Semesters 1-8) is in place,
> but no subjects or notes are published yet. Empty semesters show a "Notes coming soon"
> page. The two sample MDX files under `src/content` are placeholders and are
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

- Node.js **20.9 or newer** (required by Next.js 16). Node 22 or 24 LTS is recommended.
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

Run `npm run lint && npm run typecheck && npm test && npm run build` before opening a PR.

### Configuration

| Variable               | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin. Optional; defaults to `https://procoderji.com`.  |

The primary domain is `https://procoderji.com`. Canonical links, Open Graph URLs,
`sitemap.xml` and `robots.txt` all use it. Set `NEXT_PUBLIC_SITE_URL` only to override
it (for example on a staging build) in your hosting provider's environment settings or a
local, git-ignored `.env.local`. An unset or malformed value falls back to the default.
The value is inlined at build time, so redeploy after changing it.

## Adding notes

1. Write the unit as an MDX/Markdown file under `src/content/courses/...`.
2. Register it in `src/data/courses.json` under the right branch → semester:

   ```json
   {
     "slug": "intro-to-web",
     "title": "Introduction to Web",
     "units": [
       {
         "slug": "unit-1",
         "title": "Unit 1 - Introduction",
         "path": "content/courses/btech/cse/sem1/intro-to-web/unit-1.mdx"
       }
     ]
   }
   ```

   (`path` is relative to `src/` and must stay inside `src/content`.)
3. Only publish reviewed, genuine content. The catalogue drives the sidebar, hero,
   dashboard, `generateMetadata` and the sitemap, so a registered subject appears
   everywhere automatically.

Notes may use standard Markdown. JavaScript expressions in MDX are blocked. Links are
restricted to `http`, `https`, `mailto` and relative URLs.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # landing page
│   ├── dashboard/            # reader: branch → semester → subject → ?note=unit
│   ├── courses/              # plain duplicate reader (noindex)
│   ├── robots.ts, sitemap.ts # use the site URL + the catalogue
├── components/               # landing sections, sidebar, cards, empty state
├── content/                  # MDX notes (placeholders only for now)
├── data/courses.json         # catalogue: the single source of truth
└── lib/                      # catalogue helpers, markdown parser, mailto, SEO (tested)
```

## Contributing

Issues and pull requests are welcome. Keep changes focused, add or update a test where
practical, and don't add placeholder or invented study content.

## License

MIT - see [LICENSE](LICENSE).
