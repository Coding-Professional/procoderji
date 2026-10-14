# Deployment and launch guide

Everything in this file is a **manual step for the site owner**. The code never changes DNS or
Vercel settings, and nothing here has been done for you. State of the domains was checked
read-only on 2026-10-14.

## 1. Environment variables

Set these in Vercel: **Project -> Settings -> Environment Variables**. Neither value is a secret.

| Name | Value | Environments | Notes |
| --- | --- | --- | --- |
| `YOUTUBE_CHANNEL_ID` | `UC74q2pzSGuoaikYwnavcGMg` | Production (and Preview if you want videos there) | Enables the "Latest videos" section. Verified against the channel feed for @Pro_coder_ji. Leave it unset to hide the section. |
| `NEXT_PUBLIC_SITE_URL` | *(do not set)* | - | The site already defaults to `https://procoderji.com`. Only set it to override, e.g. on a staging project. |

Steps:

1. Open the project in Vercel, then Settings, then Environment Variables.
2. Add `YOUTUBE_CHANNEL_ID` with the value above, tick **Production** (optionally **Preview**), save.
3. **Redeploy** (Deployments, the latest one, the menu, Redeploy). Values are read at build time, so
   a change only takes effect after a new deployment.
4. For local development copy `.env.example` to `.env.local` (that file is git-ignored).

The Privacy page mentions the YouTube thumbnail requests automatically while the variable is set.

## 2. Make `https://procoderji.com` the primary domain (apex), redirect `www` to it

**Why:** today `https://procoderji.com` answers with a **308 redirect to `https://www.procoderji.com`**,
but the site declares `https://procoderji.com` as its canonical address (canonical tags, Open Graph
URLs, sitemap, robots). Search engines treat a canonical that redirects elsewhere as a conflicting
signal. The two must agree.

**No DNS change is needed.** Both hosts already resolve to Vercel (checked 2026-10-14: the apex
`A` record points at Vercel, and `www` is a `CNAME` to a `vercel-dns` host). Only change DNS if the
Vercel Domains page itself shows "Invalid Configuration" for a domain, and then use exactly the
values Vercel displays there.

Steps (button names can vary slightly between Vercel UI versions):

1. Vercel dashboard -> your team -> the **ProCoderJii Notes** project -> **Settings -> Domains**.
2. Find **`procoderji.com`**. Click **Edit**. Make sure it is set to serve the **Production** deployment
   directly and is **not** set to "Redirect to another domain". Save.
3. Find **`www.procoderji.com`**. Click **Edit**. Choose **Redirect to Another Domain**, enter
   **`procoderji.com`**, and pick **308 Permanent Redirect**. Save.
4. If the page offers "Set as primary" for `procoderji.com`, choose it.
5. Wait about a minute, then verify (see below).

**Verify** (run in a terminal; expected results shown):

```bash
curl -sI https://procoderji.com/          # expect: HTTP/2 200   (no Location header)
curl -sI https://www.procoderji.com/      # expect: HTTP/2 308   Location: https://procoderji.com/
curl -sI http://procoderji.com/           # expect: 308 to https://procoderji.com/
curl -s  https://procoderji.com/robots.txt   # expect: ... Sitemap: https://procoderji.com/sitemap.xml
```

**Alternative (not recommended):** keep `www` as primary instead. Then set
`NEXT_PUBLIC_SITE_URL=https://www.procoderji.com` in Vercel, redeploy, and update the apex to redirect
to `www`. The default in the code, the tests and the docs all assume the apex.

## 3. Other domains

- **`procoderji.xyz`** (checked 2026-10-14): its DNS points at Vercel, but HTTPS fails (no valid
  certificate), so it does not serve a working site. The code no longer links to it. Choose one:
  leave it as it is; or in Vercel add it to this project and set it to redirect to
  `procoderji.com` (Vercel will tell you if DNS verification is needed); or remove its DNS records.
- **`satyam.procoderji.com`** is a separate portfolio site. Nothing in this project touches it.

## 4. Before you merge and deploy

Run these locally; all must pass:

```bash
npm ci
npm run typecheck && npm run lint && npm test
npm run launch-check        # builds the real site and crawls it
npm run e2e                 # real-Chrome browser tests (needs Chrome installed)
```

To also run the latest-videos checks (three cards on phones, six on desktop), set the channel for that
run, for example `YOUTUBE_CHANNEL_ID=UC74q2pzSGuoaikYwnavcGMg npm run e2e` (they need internet access
to YouTube's feed and are reported as skipped otherwise).

**Decide before launch: the dashboard background image.** `public/bg.jpg` (9.8 MB, used faintly behind
the dashboard) is a stock illustration from Rawpixel Ltd. ("Graduating in the time of covid-19
background", 2020). Its embedded metadata marks it copyright-protected and links
`rawpixel.com/services/licenses`; nothing in the repository shows a licence for it. Unless you can show a
Rawpixel licence that covers this use, replace it (for example with a plain CSS background, which also
removes 9.8 MB of page weight) or delete it, and note that it already exists in the repository history.

Then merge the branch via a pull request and let Vercel build it. Review the preview deployment
first (Vercel normally keeps preview URLs out of search results, but confirm in your project settings).

## 5. Complete the legal pages (they are Drafts until you do)

Open `src/lib/legal.ts` and set the two remaining fields:

```ts
courtsLocation: "City, State",     // whose courts have jurisdiction, e.g. where you live
effectiveDate: "YYYY-MM-DD",       // the date you publish the pages
```

Both are required. While either is missing every legal page shows a "Draft" banner, is `noindex`
and stays out of the sitemap; once both are set the banner disappears, the pages become indexable
and are added to the sitemap automatically. Have a qualified adviser review the texts first.

## 6. After the first production deploy

1. Confirm the four `curl` checks in section 2 and open `https://procoderji.com/` in a private window.
2. In Google Search Console add the property (a **Domain** property verified with a DNS TXT record
   covers apex, `www` and `https`), then submit `https://procoderji.com/sitemap.xml`.
3. Check the social preview of the home page and one inner page with a share-preview tool (the card
   should show the ProCoderJii badge from `/og.png`).
4. Check the "Latest videos" section shows recent uploads from the channel.
5. Empty sections (`/guides`, `/jobs`, semesters without notes) stay `noindex` and unlinked until you
   add genuine content; nothing else is required for that.

## 7. Hosting plan

The free Vercel Hobby plan is, as far as I know, limited to non-commercial use. A site that carries
advertising is commercial, so check Vercel's current terms and plans before you apply for AdSense.
This repository does not change or choose a plan.
