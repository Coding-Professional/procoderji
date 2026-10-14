# Content guide: adding notes

Notes are plain files in this repository; there is no admin panel or database.
Only publish **reviewed, original** material (or link to the official source).
Do not paste other people's notes, papers or PDFs without written permission.

## How it fits together

1. `src/data/courses.json` is the catalogue: course → branch → semester → subject → unit.
2. `src/content/**.mdx` holds the text of each unit.
3. Registering a unit in the catalogue is what publishes it. It then appears in the
   sidebar, on the subject page, in the sitemap, and at its own URL:

   `/dashboard/<course>/<branch>/<semester>/<subject>/<unit>`

Semesters without subjects show a "Notes coming soon" page and are kept out of search
results and the sitemap. Do not add placeholder or sample units.

## Add a subject and units

In `src/data/courses.json`, find the branch and semester and add a subject:

```json
{
  "slug": "data-structures",
  "title": "Data Structures",
  "desc": "One or two original sentences describing the subject.",
  "units": [
    {
      "slug": "unit-1",
      "title": "Unit 1 - Arrays and Linked Lists",
      "desc": "Optional short summary shown on the card and in search results.",
      "path": "content/courses/btech/cse/sem3/data-structures/unit-1.mdx",
      "addedAt": "2026-11-01",
      "updatedAt": "2026-11-01"
    }
  ]
}
```

| Field       | Rules                                                                                 |
| ----------- | ------------------------------------------------------------------------------------- |
| `slug`      | lowercase letters, digits and single hyphens; unique among siblings                   |
| `title`     | non-empty                                                                             |
| `desc`      | optional, original wording                                                            |
| `path`      | relative to `src/`, must point to an existing file **inside** `src/content`           |
| `addedAt`   | optional `YYYY-MM-DD`; shown on the page and used for the sitemap `lastmod`           |
| `updatedAt` | optional `YYYY-MM-DD`, not earlier than `addedAt`; update it when you change the note |

Dates are never invented: if you leave them out, no date is shown and no `lastmod` is
published. Units are listed in array order, which is also the previous/next order.

## Write the note

Create the file at the `path` you registered. Standard Markdown is supported: headings,
paragraphs, lists, links, images, block quotes, and fenced code blocks.

```md
## Arrays
An array stores elements in contiguous memory...

### Why it matters
- Fast index access
- Costly insertion in the middle
```

**Do not repeat the unit title.** The page already shows the `title` from the catalogue as its
main heading, so start the note with its first section. Headings inside a note are shown one
level lower than written (`#` appears as a second-level heading, `##` as third-level) so each
page keeps a single main heading.

Notes are **Markdown only**. For safety, raw HTML or JSX tags (`<script>`, `<iframe>`,
`<div>`...), `{JavaScript expressions}` and `import`/`export` lines are removed when the
page is built, and a note that is not valid MDX fails the build instead of being published.
Links are limited to `http`, `https`, `mailto` and relative URLs. Tables need a plugin that
is not installed yet, so avoid them for now.

## Check your work

```bash
npm run dev          # read it at the unit URL
npm run lint && npm run typecheck && npm test && npm run build
```

`npm test` validates the catalogue against the files on disk (unique slugs, real dates,
every registered note exists inside `src/content`).

## Troubleshooting

- **404** - the slugs in the URL must match the catalogue exactly.
- **"This note is not available yet"** - the `path` does not point to a readable file.
- **Build fails on a note** - the file contains invalid MDX (for example an unclosed tag).

## Guides

Original guides (interview prep, DSA roadmaps, system design, resumes, GitHub, tools) are
registered in `src/data/guides.json` and written as Markdown under `src/content/guides/`.

```json
{
  "slug": "dsa-roadmap",
  "title": "A DSA roadmap",
  "description": "One or two original sentences, used on the card and in search results.",
  "category": "dsa",
  "level": "beginner",
  "path": "content/guides/dsa-roadmap.mdx",
  "addedAt": "2026-11-01"
}
```

`category` is one of `interview-prep`, `dsa`, `system-design`, `resume`, `github`, `tools`;
`level` is `beginner`, `intermediate` or `advanced`. `updatedAt` is optional. The same Markdown
safety rules as notes apply. The `/guides` section only appears in the navigation and the
sitemap once at least one guide is registered, and `npm test` validates the file.

## Jobs and internships (hand-curated)

Listings live in `src/data/jobs.json`. There is no scraping and no feed: every entry is added
by hand after checking the employer's own careers page.

```json
{
  "id": "company-role-2026",
  "company": "Company name",
  "title": "Role title",
  "category": "fresher",
  "employmentType": "full-time",
  "location": { "city": "City", "country": "India", "remote": false },
  "eligibility": { "degrees": ["B.Tech"], "batches": [2026], "skills": ["..."] },
  "summary": "Short summary in YOUR OWN words (max 400 characters).",
  "applyUrl": "https://the-employer.example/careers/123",
  "postedAt": "2026-11-01",
  "deadline": "2026-11-30",
  "lastVerifiedAt": "2026-11-02"
}
```

Rules enforced by `npm test` and the page:

- `applyUrl` must be `https` and the employer's **official** page (no link shorteners, no
  credentials in the URL). Do not use referral or affiliate links.
- Do **not** paste job descriptions: write a short original summary.
- Set `lastVerifiedAt` every time you re-check a listing. After 30 days without a re-check it is
  flagged "Not recently verified".
- After the `deadline` the listing shows as **Closed** (no apply link) and is archived (hidden)
  60 days later. Listings without a deadline are archived 90 days after `lastVerifiedAt`.
- Dates must be real `YYYY-MM-DD` dates and not in the future. Never invent a listing or a date.
- The `/jobs` page refreshes daily, so status changes without a redeploy. It is `noindex` and
  left out of the sitemap while nothing is open.

## Latest videos

The home page can show the latest uploads from the channel using YouTube's public feed (no API
key). Set the server-side environment variable `YOUTUBE_CHANNEL_ID` (the channel's `UC...` id,
24 characters) in your hosting settings and redeploy. Until it is set the section is hidden. The
Privacy page mentions the YouTube thumbnail requests automatically when it is enabled.
