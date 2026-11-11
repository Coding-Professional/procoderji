# Import a portfolio from Markdown

Download [`portfolio.md`](../public/templates/portfolio.md) from the editor, replace the sample
details with your own, then choose the file in the portfolio editor. You can also copy the
editor's AI prompt into your own writing tool with the template and the facts you want to use.
Review the resulting fields and preview before saving. Import never saves or publishes a page.

Files must contain well-formed UTF-8 text and be at most **50 KiB**. Keep the following structure:

- A `---` front-matter block with `name`, `headline`, `theme`, `github`, `linkedin`, `website`
  and optional `email`. Use `simple` or `developer` for the theme. Links use `https`; email is
  a plain address. Omit optional empty values if you prefer.
- The `## About`, `## Skills`, `## Projects`, `## Education`, `## Experience` and
  `## Achievements` headings. Keep a heading empty when it does not apply.
- Skills and achievements use one `- item` line per entry.
- Each project, education or experience entry starts with a `###` heading. Its title is the
  project title, institution or organization. Follow the labelled fields in the template.
- Technologies are a JSON array of strings, for example `["TypeScript", "C#"]`.

Plain field values and double-quoted JSON strings are supported. A multiline `Description` or
`Details` can use `|`, followed by lines indented with two spaces. The About paragraph can span
lines directly. Escape literal braces as `\{` and `\}` in unquoted text; escape a leading
Markdown heading marker as `\#` if it is part of that text.

This is a small import grammar, not a general YAML or MDX interpreter. Unknown sections,
unknown/duplicate fields, malformed input and shared field/link-limit violations produce clear
errors. HTML, JSX, raw JavaScript expressions, code fences and import/export statements are
rejected. The uploaded Markdown is never executed or rendered as a public page.

The parser and serializer live in `src/features/portfolio/markdown.ts`. Its tests cover the
template round trip, missing and unknown sections, invalid links, unsafe content and byte limits.
