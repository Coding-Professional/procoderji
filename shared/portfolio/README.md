# Portfolio rules

Version **2** of the student-portfolio rules is shared by the frontend and backend. The decisions behind
them are in [ADR 0002](../../docs/decisions/0002-student-portfolios.md).

| File | Purpose |
| --- | --- |
| `rules.json` | Version, themes, publishing policy, limits, reserved names, blocked words and patterns. Canonical configuration for both runtimes. |
| `fixtures.json` | Example usernames and portfolios with the problems each must produce. Both validators run all of them. |

The TypeScript validator is `src/features/portfolio/validation.ts`; the .NET validator is
`backend/src/ProCoderJi.Api/Features/Portfolio/PortfolioValidator.cs`. The TypeScript validator
gives quick feedback in the editor; the backend is the trusted check before anything is stored.

## What is checked

A portfolio has fixed fields: `theme`, `name`, `headline`, `about`, `skills`, `projects`, `education`,
`experience`, `achievements`, and `links` (`github`, `linkedin`, `website`, `email`). Anything else is
rejected as an `unknown-field`.

`theme` is optional for older drafts and publications; omission renders Simple. The only values
are `simple` and `developer`. Theme selection changes presentation, not allowed content. The
[Markdown importer](../../docs/portfolio-markdown.md) produces the same data and validator
results as the form; its source file is never rendered publicly.

- **Modes.** A *draft* only has to be well-formed, so a student can save half-finished work. *Publish* also
  requires `name` and `headline`. Entries inside a list (a project's title, an
  experience's role, a skill) are required whenever the entry exists.
- **Text.** No control or invisible characters (such as zero-width spaces or right-to-left overrides). Only
  `about`, `projects.description`, `education.details`, `experience.description` may contain line breaks. Text that looks like an HTML tag
  (a `<` directly followed by a letter, `/`, `!` or `?`) is rejected, so write `x < y` with spaces.
- **Links.** `https` only, no credentials, no port, no IP address, and no `localhost`. `links.github` must be on
  `github.com` and `links.linkedin` on `linkedin.com` (subdomains are fine). The `email` field holds an
  address such as `riya@example.com`; the page adds the `mailto:` link.
- **Username.** 3 to 30 characters: lowercase letters and digits, with single hyphens between
  them. Reserved names and names containing a blocked word are refused. Hyphens are ignored when looking for a
  blocked word, so `pay-tm` is refused too. This is deliberately strict: a harmless name such as `bank-guide` is
  refused as well.

Each problem is reported as a path and a code, written `path:code`, for example `projects[0].link:invalid-link`.
The codes are `required`, `invalid-type`, `unknown-field`, `too-short`, `too-long`, `too-many`,
`invalid-characters`, `html-like`, `invalid-format`, `invalid-link`, `invalid-host`, `invalid-email`,
`reserved` and `blocked-word`. Only the first failing check is reported for each field.

Checks run in a fixed order for each field: type, well-formed text, length, blank, then the content rules. The length
check comes before the blank check, so a field of only spaces cannot exceed its limit.

**Malformed text.** A lone surrogate (half of a UTF-16 pair, such as the text a broken emoji leaves behind) cannot be
stored or sent, so it is `invalid-characters` in a value, a link, an email or a username. In a field name it is
reported as `invalid-characters` on the object that holds it, and that object's other fields are skipped.
System.Text.Json decodes strings and field names lazily, so the .NET validator reads them without throwing and
reports the same problem. A lone surrogate escape is not portable JSON (editors and many parsers reject it), so the
`malformedText` fixtures list UTF-16 code units and each runtime builds the string itself.

## Publishing policy

`rules.json` also defines `publishing.minimumAge: 18` and
`publishing.policyVersion: "2026-11-11"`. The editor requires explicit age/Terms/Privacy
confirmation before each publish; the backend validates the current version and stores the
acceptance version and server time privately. This is self-declaration, not age verification;
no birth date is collected. These values are not student-authored portfolio fields.

Usernames stay fixed while the portfolio exists. Publishing, moderation, revisions and search
visibility are backend state rules, separate from field validation. See the
[API contract](../../docs/portfolio-api.md) and [workspace guide](../../docs/portfolio-workspace.md).

## Limits

Lengths count UTF-16 code units, the unit both JavaScript and .NET use, so one emoji counts as 2.

| Field | Maximum length |
| --- | --- |
| `name` | 80 |
| `headline` | 120 |
| `about` | 1000 |
| `skills.item` | 40 |
| `projects.title` | 80 |
| `projects.description` | 500 |
| `projects.technologies.item` | 40 |
| `education.institution` | 120 |
| `education.degree` | 120 |
| `education.period` | 40 |
| `education.details` | 300 |
| `experience.organization` | 120 |
| `experience.role` | 120 |
| `experience.period` | 40 |
| `experience.description` | 500 |
| `achievements.item` | 200 |
| `link` | 300 |
| `email` | 254 |

| List | Maximum entries |
| --- | --- |
| `skills` | 30 |
| `projects` | 8 |
| `projects.technologies` | 12 |
| `education` | 5 |
| `experience` | 6 |
| `achievements` | 10 |

## Reserved names

`u`, `www`, `api`, `app`, `admin`, `administrator`, `root`, `mail`, `email`, `smtp`, `ftp`, `docs`, `blog`, `login`, `logout`, `signin`, `signup`, `register`, `auth`, `account`, `support`, `help`, `contact`, `about`, `status`, `static`, `assets`, `cdn`, `dev`, `test`, `staging`, `preview`, `dashboard`, `courses`, `learn`, `practice`, `games`, `guides`, `jobs`, `privacy`, `terms`, `disclaimer`, `copyright`, `portfolio`, `portfolios`, `procoderji`, `satyam`, `robots`, `sitemap`, `favicon`, `icon`, `apple-icon`, `logo`, `brand`, `og`, `new`, `edit`, `settings`, `profile`, `me`, `null`, `undefined`

## Blocked words

`paytm`, `phonepe`, `razorpay`, `bank`, `login`, `verify`, `password`, `otp`, `wallet`

## Changing a rule

1. Add or change a case in `fixtures.json` first, with the `path:code` problems you expect.
2. Change `rules.json` if the change is a number, a name or a pattern.
3. Change both validators if the logic changes, and keep them identical in behaviour. The validators avoid URL
   parsers and locale-aware string functions on purpose, because JavaScript and .NET disagree about them.
4. Run `npm test` and `dotnet test backend/ProCoderJi.slnx --configuration Release`. Both must pass.

For a publishing policy change, update policy wording, shared configuration, client/backend
tests and rollout guidance together. The backend rejects old acceptance on public reads until
the student reviews and republishes under the current version. Do not silently accept on
their behalf.

The fixture file is plain ASCII: write any other character as a Unicode escape (a backslash, `u`, and four hex
digits) so reviewers can see exactly which character it is.
