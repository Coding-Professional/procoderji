# Portfolio rules

The rules for student portfolios, shared by the frontend and the backend. The decisions behind
them are in [ADR 0002](../../docs/decisions/0002-student-portfolios.md).

| File | Purpose |
| --- | --- |
| `rules.json` | Limits, reserved names, blocked words, and the patterns for links, hosts and email. The only place these numbers live. |
| `fixtures.json` | Example usernames and portfolios with the problems each must produce. Both validators run all of them. |

The TypeScript validator is `src/features/portfolio/validation.ts`; the .NET validator is
`backend/src/ProCoderJi.Api/Features/Portfolio/PortfolioValidator.cs`. The TypeScript validator
gives quick feedback in the editor; the backend is the trusted check before anything is stored.

## What is checked

A portfolio has fixed fields: `name`, `headline`, `about`, `skills`, `projects`, `education`,
`experience`, `achievements`, and `links` (`github`, `linkedin`, `website`, `email`). Anything else is
rejected as an `unknown-field`.

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

The fixture file is plain ASCII: write any other character as a Unicode escape (a backslash, `u`, and four hex
digits) so reviewers can see exactly which character it is.
