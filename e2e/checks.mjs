import { chromium, devices } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { runPortfolioChecks } from "./portfolio-checks.mjs";

const BASE = process.env.BASE || "http://localhost:3150";
const CHANNEL = process.env.E2E_CHANNEL || "chrome";
const FULLSTACK = process.env.E2E_DOTNET === "1";
const OUT = path.resolve("e2e/.out");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  "/", "/dashboard", "/dashboard/btech", "/dashboard/btech/cse", "/dashboard/btech/cse/sem1",
  "/dashboard/btech/cse/sem2", "/dashboard/btech/cse/sem1/qa-subject",
  "/dashboard/btech/cse/sem1/qa-subject/unit-a", "/dashboard/btech/cse/sem1/qa-subject/unit-b",
  "/guides", "/guides/qa-guide", "/jobs", "/games", "/games/pattern-sprint", "/games/digit-recall",
  "/learn", "/practice", "/practice/quantitative", "/account",
  "/about", "/privacy", "/terms", "/disclaimer", "/copyright",
  "/nope/zzz", "/dashboard/btech/year3/sem5/ml",
];

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  mobile: { ...devices["Pixel 7"] },
};

const findings = [];
const NOISE = (kind, detail) =>
  (kind === "CONSOLE-ERRORS" && /status of 404/.test(detail)) ||
  (kind === "ELEMENT-OVERFLOW" && /^DIV:$/.test(detail));
const note = (vp, url, kind, detail) => { if (!NOISE(kind, String(detail))) findings.push({ vp, url, kind, detail }); };

const browser = await chromium.launch({ channel: CHANNEL, headless: true });

for (const [vpName, opts] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext(opts);
  for (const url of PAGES) {
    const page = await context.newPage();
    const errors = [];
    const failed = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
    // Next cancels in-flight link prefetches (?_rsc=) when the page changes; that is not a failure.
    page.on("requestfailed", (r) => { const err = r.failure()?.errorText ?? ""; if (/_rsc=/.test(r.url()) && err.includes("ERR_ABORTED")) return; failed.push(r.url() + " " + err); });
    // A 404 for the page itself is expected on the not-found pages; any other 4xx/5xx is a failure.
    page.on("response", (r) => { if (r.status() >= 400 && !(r.status() === 404 && r.url() === BASE + url)) failed.push(r.status() + " " + r.url()); });

    const resp = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => { note(vpName, url, "NAV-ERROR", e.message); return null; });
    if (!resp) { await page.close(); continue; }
    await page.waitForTimeout(600);

    const info = await page.evaluate(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const nameOf = (el) => (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.textContent || el.textContent || el.getAttribute("title") || el.querySelector("img[alt]")?.getAttribute("alt") || "").trim();
      const unnamed = [...document.querySelectorAll("a[href],button,[role=button],input:not([type=hidden]),textarea,select")].filter(vis).filter((el) => {
        if (el.matches("input,textarea,select")) {
          const id = el.id; return !(el.getAttribute("aria-label") || (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label"));
        }
        return !nameOf(el);
      }).map((el) => el.outerHTML.slice(0, 120));
      const imgsNoAlt = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).map((i) => i.src);
      const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => Number(h.tagName[1]));
      const skips = headings.some((h, i) => i > 0 && h - headings[i - 1] > 1);
      const meta = (n, a = "name") => document.querySelector(`meta[${a}="${n}"]`)?.getAttribute("content") ?? null;
      return {
        title: document.title,
        lang: document.documentElement.lang,
        h1: [...document.querySelectorAll("h1")].filter(vis).length,
        mains: document.querySelectorAll("main").length,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        clipped: [...document.querySelectorAll('main *')].filter((el) => !el.closest('pre') && vis(el) && el.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 3).map((el) => el.tagName + ':' + (el.textContent || '').trim().slice(0, 40)),
        unnamed, imgsNoAlt, skips, headings: headings.join(""),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
        robots: meta("robots"), description: meta("description"), ogUrl: meta("og:url", "property"),
        pwned: typeof window.__qapwned !== "undefined", jsLinks: document.querySelectorAll('a[href^="javascript:"]').length,
        scripts: [...document.querySelectorAll("main script:not([type='application/ld+json']),article script:not([type='application/ld+json'])")].length,
      };
    });

    const status = resp.status();
    const line = `${vpName.padEnd(7)} ${String(status).padEnd(3)} ${url.padEnd(48)} h1=${info.h1} main=${info.mains} ovfX=${info.overflowX} robots=${info.robots ?? "-"} canon=${info.canonical ? "y" : "-"}`;
    console.log(line);
    if (info.clipped.length) note(vpName, url, "ELEMENT-OVERFLOW", info.clipped.join(" | "));
    if (info.overflowX > 0) note(vpName, url, "HORIZONTAL-OVERFLOW", info.overflowX + "px");
    if (errors.length) note(vpName, url, "CONSOLE-ERRORS", errors.slice(0, 3).join(" | "));
    if (failed.length) note(vpName, url, "FAILED-REQUESTS", failed.slice(0, 3).join(" | "));
    if (info.unnamed.length) note(vpName, url, "UNNAMED-CONTROLS", info.unnamed.slice(0, 3).join(" | "));
    if (info.imgsNoAlt.length) note(vpName, url, "IMG-NO-ALT", info.imgsNoAlt.slice(0, 2).join(", "));
    if (status === 200 && info.h1 !== 1) note(vpName, url, "H1-COUNT", String(info.h1));
    if (info.mains !== 1) note(vpName, url, "MAIN-COUNT", String(info.mains));
    if (info.skips) note(vpName, url, "HEADING-SKIP", info.headings);
    if (info.lang !== "en") note(vpName, url, "LANG", info.lang);
    if (info.pwned || info.jsLinks || info.scripts) note(vpName, url, "CONTENT-SECURITY", JSON.stringify({ pwned: info.pwned, jsLinks: info.jsLinks, scripts: info.scripts }));
    if (status === 200 && !info.description) note(vpName, url, "NO-DESCRIPTION", "");

    const safe = url.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "home";
    await page.screenshot({ path: path.join(OUT, `${vpName}-${safe}.png`), fullPage: true });
    await page.close();
  }
  await context.close();
}

// ---------- interactions ----------
async function interaction(name, vpName, fn) {
  const context = await browser.newContext(VIEWPORTS[vpName]);
  const page = await context.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  try {
    await fn(page);
    console.log(`PASS  ${vpName.padEnd(7)} ${name}`);
  } catch (e) {
    console.log(`FAIL  ${vpName.padEnd(7)} ${name}: ${e.message.split("\n")[0]}`);
    note(vpName, name, "INTERACTION-FAIL", e.message.split("\n")[0]);
    await page.screenshot({ path: path.join(OUT, `FAIL-${vpName}-${name.replace(/\W+/g, "_")}.png`), fullPage: true }).catch(() => {});
  }
  if (errs.length) note(vpName, name, "PAGEERROR", errs[0]);
  await context.close();
}
const expectTrue = (v, msg) => { if (!v) throw new Error(msg); };

if (FULLSTACK) {
  await interaction("account: Google challenge and anonymous API boundaries", "desktop", async (page) => {
    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    const googleButton = page.getByRole("button", { name: "Continue with Google", exact: true });
    await googleButton.waitFor({ state: "visible" });
    const googleForm = googleButton.locator("xpath=ancestor::form");
    expectTrue((await googleForm.getAttribute("action")) === "/api/platform/auth/google" && (await googleForm.getAttribute("method")) === "get", "Google sign-in uses a full-page same-origin account challenge");
    expectTrue((await googleForm.locator('input[name="returnTo"]').inputValue()) === "/learn", "Google sign-in returns to the learning workspace");

    const sessionResponse = await page.request.get(BASE + "/api/platform/auth/session");
    expectTrue(sessionResponse.status() === 200, "anonymous account session returns 200");
    const session = await sessionResponse.json();
    expectTrue(session.configured === true && session.user === null, "fake Google configuration enables sign-in without authenticating a learner");
    expectTrue(typeof session.csrfToken === "string" && session.csrfToken.length > 0, "session exposes the antiforgery request token");
    expectTrue((sessionResponse.headers()["cache-control"] ?? "").includes("no-store"), "account responses are not cached");

    // Never visit the external identity provider. Inspect only our challenge response.
    const challenge = await page.request.get(BASE + "/api/platform/auth/google?returnTo=/learn", { maxRedirects: 0 });
    expectTrue(challenge.status() === 302, `Google challenge returns a redirect (got ${challenge.status()})`);
    const location = challenge.headers().location;
    expectTrue(Boolean(location), "Google challenge provides an authorization URL");
    const authorization = new URL(location);
    expectTrue(authorization.hostname === "accounts.google.com", "challenge targets Google's authorization host");
    expectTrue(authorization.searchParams.get("redirect_uri") === new URL("/api/platform/signin-google", BASE).href, "Google callback points back to the frontend proxy");
    expectTrue(challenge.headersArray().some((header) => header.name.toLowerCase() === "set-cookie" && header.value.includes(".AspNetCore.Correlation.")), "challenge sets its browser correlation cookie");

    const progress = await page.request.get(BASE + "/api/platform/progress");
    expectTrue(progress.status() === 401, `anonymous progress remains protected (got ${progress.status()})`);
    const portfolio = await page.request.get(BASE + "/api/platform/portfolio");
    expectTrue(portfolio.status() === 401, `anonymous portfolio drafts remain protected (got ${portfolio.status()})`);
    const publicPortfolio = await page.request.get(BASE + "/api/platform/portfolio/public/riya-student");
    expectTrue(publicPortfolio.status() === 404, "public portfolio reads stay disabled before launch");
    expectTrue(publicPortfolio.headers()["x-robots-tag"] === "noindex", "public API responses cannot be indexed as portfolio pages");
    const invalidPortfolioPath = await page.request.get(BASE + "/api/platform/portfolio/operator");
    expectTrue(invalidPortfolioPath.status() === 404, "the frontend proxy rejects unknown portfolio actions");
    const logout = await page.request.post(BASE + "/api/platform/auth/logout", { headers: { Origin: new URL(BASE).origin }, maxRedirects: 0 });
    expectTrue(logout.status() === 403, `same-origin logout still requires an antiforgery token (got ${logout.status()})`);
  });
}

await interaction("home: mobile menu opens, lists links, closes", "mobile", async (page) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: /open menu/i });
  await btn.waitFor({ state: "visible" });
  expectTrue((await btn.getAttribute("aria-expanded")) === "false", "aria-expanded should start false");
  await btn.click();
  await page.locator("#mobile-menu").waitFor({ state: "visible" });
  expectTrue((await page.getByRole("button", { name: /close menu/i }).getAttribute("aria-expanded")) === "true", "aria-expanded should be true when open");
  for (const t of ["About", "Games", "Contact", "Guides", "Jobs", "Browse Notes"]) {
    expectTrue(await page.locator("#mobile-menu").getByText(t, { exact: true }).isVisible(), `menu should list ${t}`);
  }
  await page.getByRole("button", { name: /close menu/i }).click();
  await page.locator("#mobile-menu").waitFor({ state: "hidden" });
});

await interaction("home: original mobile menu links remain reachable on short screens", "mobile", async (page) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const notes = page.locator("#mobile-menu").getByRole("link", { name: "Browse Notes", exact: true });
  await notes.scrollIntoViewIfNeeded();
  const bounds = await notes.boundingBox();
  expectTrue(bounds.y + bounds.height <= 568, "last menu action stays within the viewport");
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await page.locator("#mobile-menu").waitFor({ state: "hidden" });
});

await interaction("home: desktop nav has working links", "desktop", async (page) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  for (const [t, href] of [["Games", "/games"], ["Guides", "/guides"], ["Jobs", "/jobs"], ["Browse Notes", "/dashboard"]]) {
    const a = page.locator("nav").getByRole("link", { name: t, exact: true }).first();
    expectTrue((await a.getAttribute("href")) === href, `${t} should link to ${href}`);
  }
  expectTrue((await page.locator("a[href*='procoderji.xyz']").count()) === 0, "no .xyz links");
});

await interaction("games: pattern round reaches a result", "desktop", async (page) => {
  await page.goto(BASE + "/games/pattern-sprint", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start game" }).click();
  for (let i = 0; i < 8; i++) {
    await page.getByRole("button", { name: /^Answer \d+$/ }).first().click();
    expectTrue(await page.getByRole("status").isVisible(), "answer feedback appears");
    await page.getByRole("button", { name: i === 7 ? "See result" : "Next question" }).click();
  }
  expectTrue(await page.getByText(/You got \d out of 8/).isVisible(), "final score appears");
});

await interaction("games: digit recall accepts an answer", "mobile", async (page) => {
  await page.goto(BASE + "/games/digit-recall", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start game" }).click();
  const shown = await page.locator("[role=status] .font-mono").textContent();
  await page.getByLabel("What was the number?").waitFor({ state: "visible" });
  await page.getByLabel("What was the number?").fill(shown.trim());
  await page.getByRole("button", { name: "Check answer" }).click();
  expectTrue(await page.getByRole("heading", { name: "Correct!" }).isVisible(), "correct answer feedback appears");
});

for (const vp of ["desktop", "mobile"]) {
  await interaction("practice: guest sessions persist and can be deleted", vp, async (page) => {
    await page.goto(BASE + "/practice/reasoning", { waitUntil: "networkidle" });
    await page.getByLabel("Session length").selectOption("3");
    await page.getByRole("button", { name: "Start practice", exact: true }).click();
    for (let index = 0; index < 3; index++) {
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: index === 2 ? "Finish session" : "Next question", exact: true }).click();
    }
    await page.getByRole("heading", { name: "Session complete", exact: true }).waitFor({ state: "visible" });
    const review = page.locator("section").filter({ has: page.getByRole("heading", { name: "Answer review", exact: true }) });
    expectTrue((await review.locator("article").count()) === 3, "every question has an answer review");
    expectTrue((await review.getByText("Correct answer:", { exact: true }).count()) === 3, "review includes every correct answer");
    const explanations = await review.locator("article > p:last-child").allTextContents();
    expectTrue(explanations.length === 3 && explanations.every((text) => text.trim().length > 20), "review includes useful explanations");
    await page.getByRole("link", { name: "Review progress", exact: true }).click();
    await page.waitForURL(/\/learn$/);
    const completedSessions = () => page.locator("section").filter({ has: page.getByRole("heading", { name: "Completed sessions", exact: true }) });
    await completedSessions().getByText("1", { exact: true }).waitFor({ state: "visible" });
    await page.reload({ waitUntil: "networkidle" });
    await completedSessions().getByText("1", { exact: true }).waitFor({ state: "visible" });

    await page.goto(BASE + "/account", { waitUntil: "networkidle" });
    const dataControls = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your progress data", exact: true }) });
    let guestDeletionConfirmed = false;
    page.once("dialog", (dialog) => {
      guestDeletionConfirmed = dialog.type() === "confirm" && dialog.message().includes("guest practice history");
      return dialog.accept();
    });
    await dataControls.getByRole("button", { name: "Delete progress", exact: true }).click();
    expectTrue(guestDeletionConfirmed, "guest history deletion requires explicit confirmation");
    await page.getByText("Practice history deleted for this workspace.", { exact: true }).waitFor({ state: "visible" });
    await page.goto(BASE + "/learn", { waitUntil: "networkidle" });
    await completedSessions().getByText("0", { exact: true }).waitFor({ state: "visible" });
    await page.reload({ waitUntil: "networkidle" });
    await completedSessions().getByText("0", { exact: true }).waitFor({ state: "visible" });
  });
}

for (const vp of ["desktop", "mobile"]) {
  await interaction("hero: pick branch then semester", vp, async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "CSE", exact: true }).click();
    await page.waitForURL(/\?branch=cse/);
    const sem = page.getByRole("link", { name: /Semester/ }).first();
    await sem.waitFor({ state: "visible" });
    expectTrue((await page.getByRole("link", { name: /Semester/ }).count()) === 8, "should show 8 semesters");
    await page.getByRole("link", { name: /Semester/ }).first().click();
    await page.waitForURL(/\/dashboard\/btech\/cse\/sem1$/);
    expectTrue(await page.getByRole("heading", { level: 1 }).isVisible(), "semester page has h1");
  });
}

await interaction("hero: invalid ?branch ignored", "desktop", async (page) => {
  await page.goto(BASE + "/?branch=mechanical", { waitUntil: "networkidle" });
  expectTrue(await page.getByRole("button", { name: "CSE", exact: true }).isVisible(), "falls back to branch list");
});

await interaction("skip link is first tab stop and works", "desktop", async (page) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expectTrue(/skip to main content/i.test(focused ?? ""), "first tab stop is the skip link, got: " + focused);
  expectTrue(await page.getByText("Skip to main content").isVisible(), "skip link visible on focus");
  await page.keyboard.press("Enter");
  expectTrue(page.url().endsWith("#main-content"), "skip link jumps to main");
});

await interaction("contact form: required validation, labels, mailto target", "desktop", async (page) => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const form = page.locator("form").first();
  expectTrue(!(await form.evaluate((f) => f.checkValidity())), "empty form should be invalid");
  for (const id of ["contact-name", "contact-email", "contact-subject", "contact-message"]) {
    expectTrue((await page.locator(`label[for=${id}]`).count()) === 1, `label for ${id}`);
  }
  await page.fill("#contact-name", "QA"); await page.fill("#contact-email", "qa@example.com");
  await page.fill("#contact-subject", "Hi"); await page.fill("#contact-message", "Hello");
  expectTrue(await form.evaluate((f) => f.checkValidity()), "filled form valid");
});

await interaction("dashboard: mobile drawer opens, Escape closes", "mobile", async (page) => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /open navigation menu/i }).click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ state: "visible" });
  expectTrue(await dlg.getByRole("link", { name: /Browse Notes/ }).isVisible(), "drawer has Browse Notes");
  await page.getByRole("button", { name: "Close navigation menu", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  expectTrue(await dlg.evaluate(el => el.contains(document.activeElement)), "keyboard focus stays inside the drawer");
  await page.keyboard.press("Escape");
  await dlg.waitFor({ state: "hidden" });
  expectTrue(await page.getByRole("button", { name: /open navigation menu/i }).evaluate(el => el === document.activeElement), "drawer closes back to its toggle");
});

await interaction("dashboard: sidebar expands to semester and navigates (desktop)", "desktop", async (page) => {
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /B\.Tech/ }).click();
  await page.getByRole("button", { name: "CSE" }).click();
  await page.locator("aside").getByRole("link", { name: "Semester 1" }).click();
  await page.waitForURL(/\/dashboard\/btech\/cse\/sem1$/);
  expectTrue((await page.locator("aside").getByRole("link", { name: "Semester 1", exact: true }).getAttribute("aria-current")) === "page", "active sidebar link has aria-current");
});

await interaction("unit page: prev/next, breadcrumbs, safe content", "desktop", async (page) => {
  await page.goto(BASE + "/dashboard/btech/cse/sem1/qa-subject/unit-a", { waitUntil: "networkidle" });
  expectTrue(await page.getByRole("link", { name: /QA Unit B/ }).isVisible(), "next link");
  expectTrue((await page.locator("nav[aria-label=Breadcrumb] a").count()) >= 5, "breadcrumbs");
  expectTrue(await page.getByText("1 min read").isVisible(), "reading time");
  expectTrue(await page.getByText("Updated 5 Oct 2026").isVisible(), "updated date");
  expectTrue(!(await page.evaluate(() => typeof window.__qapwned !== "undefined")), "note script did not run");
  expectTrue((await page.locator("a[href^=javascript]").count()) === 0, "no javascript: links");
  await page.getByRole("link", { name: /QA Unit B/ }).click();
  await page.waitForURL(/unit-b$/);
});

await interaction("old /courses URLs redirect to the matching dashboard pages", "desktop", async (page) => {
  for (const [from, to] of [
    ["/courses", "/dashboard"],
    ["/courses/btech/cse/sem1", "/dashboard/btech/cse/sem1"],
    ["/courses/btech/cse/sem1/qa-subject/unit-a", "/dashboard/btech/cse/sem1/qa-subject/unit-a"],
  ]) {
    const r = await page.goto(BASE + from, { waitUntil: "networkidle" });
    expectTrue(r.status() === 200, from + " should end on a 200 page, got " + r.status());
    expectTrue(new URL(page.url()).pathname === to, from + " should land on " + to + ", landed on " + new URL(page.url()).pathname);
  }
});

await interaction("legacy ?note redirects to unit page", "desktop", async (page) => {
  await page.goto(BASE + "/dashboard/btech/cse/sem1/qa-subject?note=unit-a", { waitUntil: "networkidle" });
  expectTrue(page.url().endsWith("/qa-subject/unit-a"), "redirected to " + page.url());
});

await interaction("404 page is branded with working links", "mobile", async (page) => {
  const r = await page.goto(BASE + "/no/such/page", { waitUntil: "networkidle" });
  expectTrue(r.status() === 404, "status 404");
  expectTrue(await page.getByRole("heading", { name: /could not find/i }).isVisible(), "branded heading");
  await page.getByRole("link", { name: "Browse notes" }).click();
  await page.waitForURL(/\/dashboard$/);
});

await interaction("jobs: statuses and apply links", "mobile", async (page) => {
  await page.goto(BASE + "/jobs", { waitUntil: "networkidle" });
  expectTrue(await page.getByText("Closing soon").first().isVisible(), "closing soon badge");
  expectTrue((await page.locator("a[href^='https://careers.example.com/']").count()) === 2, "apply links only for active jobs");
  expectTrue(await page.getByText("Applications have closed.").isVisible(), "closed job note");
  expectTrue((await page.getByText("Role archived-job").count()) === 0, "archived hidden");
  expectTrue((await page.locator("a[target=_blank]:not([rel*=noopener])").count()) === 0, "external links have noopener");
});

await interaction("legal pages: completed details are indexable", "desktop", async (page) => {
  await page.goto(BASE + "/terms", { waitUntil: "networkidle" });
  expectTrue((await page.getByText(/Draft - not yet reviewed/).count()) === 0, "no draft banner");
  expectTrue((await page.getByText("[REQUIRED:", { exact: false }).count()) === 0, "no required markers");
  const robots = page.locator('meta[name="robots"]');
  if (await robots.count()) {
    expectTrue(!((await robots.getAttribute("content")) ?? "").includes("noindex"), "page is indexable");
  }
  expectTrue((await page.locator('link[rel="canonical"]').getAttribute("href")) === "https://procoderji.com/terms", "canonical URL");
});

await interaction("hero headline is never covered by the floating logo (several desktop widths)", "desktop", async (page) => {
  // The floating logo tile has pointer-events:none, so elementFromPoint cannot see it: compare geometry instead.
  for (const [width, height] of [[768, 900], [1024, 768], [1280, 800], [1366, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200); // let the entrance animations finish
    const overlaps = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const range = document.createRange();
      range.selectNodeContents(h1);
      const textLines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      // Outermost pointer-events:none wrapper around every visible image = decorative overlays such as the logo tile.
      const overlays = new Set();
      for (const img of document.querySelectorAll("img")) {
        if (!img.getClientRects().length) continue;
        let el = img;
        while (el.parentElement && getComputedStyle(el.parentElement).pointerEvents === "none") el = el.parentElement;
        if (el !== img || getComputedStyle(img).pointerEvents === "none") overlays.add(el);
      }
      const hits = [];
      for (const el of overlays) {
        const o = el.getBoundingClientRect();
        if (o.width === 0 || o.height === 0 || getComputedStyle(el).display === "none") continue;
        for (const t of textLines) {
          if (o.left < t.right && o.right > t.left && o.top < t.bottom && o.bottom > t.top) hits.push(`${el.tagName}.${String(el.className).slice(0, 50)}`);
        }
      }
      return [...new Set(hits)];
    });
    expectTrue(overlaps.length === 0, `at ${width}px the headline text is overlapped by: ${overlaps.join(", ")}`);
  }
});


// Needs the live channel feed, so it only runs when YOUTUBE_CHANNEL_ID is set (otherwise the section is hidden by design).
const videosEnabled = /^UC[A-Za-z0-9_-]{22}$/.test(process.env.YOUTUBE_CHANNEL_ID ?? "");
if (!videosEnabled) console.log("SKIP  latest videos responsive checks (set YOUTUBE_CHANNEL_ID to run them)");
const videoState = async (page) =>
  page.evaluate(() => {
    const cards = [...document.querySelectorAll("#videos ul > li")];
    const visible = cards.filter((li) => li.checkVisibility());
    const hiddenLinks = cards.filter((li) => !li.checkVisibility()).flatMap((li) => [...li.querySelectorAll("a")]);
    // A display:none link must not be focusable (so keyboard and screen-reader users never land on it).
    const focusable = hiddenLinks.filter((a) => { a.focus(); return document.activeElement === a; }).length;
    const more = [...document.querySelectorAll("#videos a")].find((a) => /See more videos/i.test(a.textContent));
    return { total: cards.length, visible: visible.length, hidden: hiddenLinks.length, focusableHidden: focusable, moreLinkVisible: !!more && more.checkVisibility(), noOverflowX: document.documentElement.scrollWidth <= document.documentElement.clientWidth };
  });
if (videosEnabled) {
  await interaction("latest videos: three on phones (rest out of the tab order), all six on desktop", "mobile", async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const s = await videoState(page);
    expectTrue(s.total === 6, `expected 6 cards in the page, found ${s.total}`);
    expectTrue(s.visible === 3, `phones should show 3 videos, showing ${s.visible}`);
    expectTrue(s.hidden === 3 && s.focusableHidden === 0, `the 3 extra cards must not be focusable (focusable hidden links: ${s.focusableHidden})`);
    expectTrue(s.moreLinkVisible, "phones should get a 'See more videos on YouTube' link");
    expectTrue(s.noOverflowX, "no horizontal scrolling on phones");
  });
  await interaction("latest videos: desktop keeps all six and hides the phone-only link", "desktop", async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const s = await videoState(page);
    expectTrue(s.total === 6 && s.visible === 6, `desktop should show all 6 videos, showing ${s.visible} of ${s.total}`);
    expectTrue(!s.moreLinkVisible, "the phone-only 'See more' link should be hidden on desktop");
  });
}

await interaction("privacy page discloses every third-party host the site contacts", "desktop", async (page) => {
  // Every external host that these pages request must be named on the Privacy page.
  const DISCLOSED_AS = { "lottie.host": "lottie.host", "cdn.jsdelivr.net": "jsdelivr", "i.ytimg.com": "i.ytimg.com" };
  const base = new URL(BASE);
  const hosts = new Set();
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (/^https?:$/.test(u.protocol) && u.host !== base.host) hosts.add(u.host);
  });
  for (const url of ["/", "/dashboard", "/guides/qa-guide", "/jobs", "/dashboard/btech/cse/sem1/qa-subject/unit-a"]) {
    await page.goto(BASE + url, { waitUntil: "networkidle" });
    for (let y = 0; y < 5000; y += 700) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(120);
    }
  }
  expectTrue(hosts.size > 0, "expected the home page to contact at least the animation hosts");
  await page.goto(BASE + "/privacy", { waitUntil: "networkidle" });
  const text = (await page.locator("main").innerText()).toLowerCase();
  const missing = [...hosts].filter((h) => !text.includes((DISCLOSED_AS[h] ?? h).toLowerCase()));
  expectTrue(missing.length === 0, "undisclosed third-party host(s): " + missing.join(", "));
});

if (FULLSTACK) {
  try {
    findings.push(...await runPortfolioChecks({ browser, base: BASE, backendOrigin: process.env.E2E_BACKEND_ORIGIN || "http://127.0.0.1:5151" }));
  } catch (error) {
    note("all", "/learn/portfolio", "portfolio", `Fixture setup failed: ${String(error.message ?? error)}`);
  }
}

await browser.close();

console.log("\n========== FINDINGS ==========");
if (!findings.length) console.log("none");
const grouped = {};
for (const f of findings) (grouped[f.kind] ??= []).push(f);
for (const [k, list] of Object.entries(grouped)) {
  console.log(`\n[${k}] x${list.length}`);
  for (const f of list.slice(0, 8)) console.log(`  ${f.vp.padEnd(7)} ${f.url}  ${f.detail}`);
}

console.log(`
${findings.length} finding(s)`);
process.exit(findings.length ? 1 : 0);
