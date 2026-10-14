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
# Unit 1 - Arrays and Linked Lists

## Arrays
An array stores elements in contiguous memory...

- Fast index access
- Costly insertion in the middle
```

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
