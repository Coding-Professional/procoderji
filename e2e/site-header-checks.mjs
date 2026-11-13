// Focused browser coverage and a review gallery; no content fixtures or database writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE || "http://127.0.0.1:3180";
const out = path.resolve("e2e/.out/site-header");
fs.mkdirSync(out, { recursive: true });
const pages = [
  ["Home", "/"], ["Practice", "/practice"], ["My learning", "/learn"],
  ["Games", "/games"], ["Notes", "/dashboard"], ["About", "/about"], ["Contact", "/#contact"],
  ["Portfolio", "/learn/portfolio"],
];
const expected = [
  ["Browse Notes", "/dashboard"], ["Placement practice", "/practice"],
  ["Games", "/games"], ["About", "/about"], ["Contact", "/#contact"],
];
const widths = [360, 768, 1440];
const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || "chrome", headless: true });
const findings = [];
const screenshots = [];

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(dimensions.document <= dimensions.viewport, `${label}: document overflows by ${dimensions.document - dimensions.viewport}px`);
}

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    for (const [name, route] of pages) {
      const page = await context.newPage();
      try {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        const header = page.locator("[data-site-header]");
        await header.getByRole("button", { name: "Guest learner" }).waitFor();
        await page.evaluate(() => document.fonts.ready);
        if (["/practice", "/learn", "/learn/portfolio"].includes(route)) {
          const workspace = await page.locator("main").evaluate(el => {
            const bounds = el.parentElement.getBoundingClientRect();
            return { left: bounds.left, width: bounds.width, available: document.documentElement.clientWidth };
          });
          assert.equal(workspace.left, 0, "workspace sidebar starts at the viewport edge");
          assert.equal(workspace.width, workspace.available, "workspace uses the full available width");
        }
        if (route === "/learn/portfolio") {
          await page.locator("#portfolio-theme").selectOption("developer");
          if (width >= 1024) {
            const sidebar = page.locator("[data-learning-sidebar]");
            await page.getByRole("button", { name: "Collapse learning sidebar", exact: true }).click();
            assert((await sidebar.boundingBox()).width < 100, "collapsed sidebar becomes a compact rail");
            assert(await sidebar.getByRole("link", { name: "My portfolio", exact: true }).isVisible(), "rail keeps accessible navigation");
            await page.getByRole("button", { name: "Expand learning sidebar", exact: true }).click();
            await page.evaluate(() => window.scrollTo(0, 800));
            const top = await sidebar.evaluate(el => el.getBoundingClientRect().top);
            const bottom = await page.locator("[data-site-header]").evaluate(el => el.getBoundingClientRect().bottom);
            assert(Math.abs(top - bottom) < 2, "sidebar stays below the shared header when scrolling");
            await page.evaluate(() => window.scrollTo(0, 0));
          }
        }
        assert.equal(await header.count(), 1, "one shared header");
        const brand = header.getByRole("link", { name: "ProCoderJii", exact: true });
        assert.equal(await brand.count(), 1, "same brand label");
        assert.equal(await brand.locator("img").count(), 1, "brand includes the logo");
        await noOverflow(page, name);
        if (route !== "/" && route !== "/#contact") {
          const appearance = await header.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderBottomWidth }));
          assert.equal(appearance.background, "rgb(255, 255, 255)", "non-hero header is white");
          assert.equal(appearance.border, "1px", "non-hero header has subtle border");
        }

        if (width < 768) await header.getByRole("button", { name: "Open menu", exact: true }).click();
        else assert.equal(await header.getByRole("button", { name: "Open menu", exact: true }).isVisible(), false, "hamburger ends at 768px");
        const nav = header.getByRole("navigation", { name: "Main", exact: true });
        assert.deepEqual(await nav.getByRole("link").evaluateAll(elements => elements.map(el => [el.textContent.trim(), el.getAttribute("href")])), expected, "identical links and order");
        for (const link of await nav.getByRole("link").all()) {
          const bounds = await link.boundingBox();
          assert(bounds.width >= 44 && bounds.height >= 44, "44px navigation tap targets");
        }
        const active = route === "/practice" ? "Placement practice" : route === "/games" ? "Games" : route === "/dashboard" ? "Browse Notes" : route === "/about" ? "About" : route === "/#contact" ? "Contact" : null;
        if (active) assert.equal(await nav.getByRole("link", { name: active, exact: true }).getAttribute("aria-current"), "page");
        if (width < 768) {
          if (route === "/") await page.screenshot({ path: path.join(out, `home-menu-${width}.png`) });
          await page.keyboard.press("Escape");
          assert.equal(await header.getByRole("button", { name: "Open menu", exact: true }).evaluate(el => el === document.activeElement), true, "Escape restores focus");
        }
        const user = header.getByRole("button", { name: "Guest learner" });
        await user.click();
        await header.getByRole("navigation", { name: "Learner", exact: true }).getByRole("link", { name: "My learning", exact: true }).waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await user.evaluate(el => el === document.activeElement), true);
        if (route === "/learn" && width === 360) {
          const open = page.getByRole("button", { name: "Open learning navigation", exact: true });
          await open.click();
          await page.getByRole("dialog", { name: "Learning navigation" }).waitFor({ state: "visible" });
          await page.keyboard.press("Escape");
          await page.getByRole("dialog", { name: "Learning navigation" }).waitFor({ state: "hidden" });
          assert.equal(await open.evaluate(el => el === document.activeElement), true);
          const cards = await page.locator("main section").filter({ has: page.getByRole("heading", { name: /^(Completed sessions|Questions answered|Practice accuracy)$/ }) }).evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
          assert.equal(cards.length, 3);
          assert(cards.every(card => card.x === cards[0].x), "mobile stat cards stack");
          assert(cards[0].y < cards[1].y && cards[1].y < cards[2].y);
        }
        if (route === "/games" && width === 360) {
          const cards = await page.locator("main article").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().x));
          assert.equal(cards.length, 2); assert.equal(cards[0], cards[1], "mobile games stack");
        }
        // Reveal existing while-in-view sections before the full-page capture.
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
            window.scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 40));
          }
        });
        if (route === "/#contact") {
          await page.locator("#contact").scrollIntoViewIfNeeded();
          await page.evaluate(() => document.querySelector("#contact").scrollIntoView());
        } else await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(350);
        await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
        await noOverflow(page, name);
        if (route === "/") assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)", "home is transparent at the top");
        if (route === "/#contact") {
          const top = await page.locator("#contact").evaluate(el => el.getBoundingClientRect().top);
          const bottom = await header.evaluate(el => el.getBoundingClientRect().bottom);
          assert(top >= bottom - 1, "contact anchor stays below the header");
        }
        const slug = name.toLowerCase().replaceAll(" ", "-");
        const file = `${slug}-${width}.png`;
        await page.screenshot({ path: path.join(out, file) });
        await page.screenshot({ path: path.join(out, `${slug}-${width}-full.png`), fullPage: true });
        screenshots.push({ name, width, file });
        console.log(`PASS ${width} ${name}`);
      } catch (error) {
        findings.push({ name, width, error: error.message });
        await page.screenshot({ path: path.join(out, `failure-${name.replaceAll(" ", "-")}-${width}.png`) }).catch(() => {});
      } finally { await page.close(); }
    }
    await context.close();
  }
  const page = await browser.newPage({ viewport: { width: 767, height: 800 } });
  await page.goto(base + "/learn", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForFunction(() => !document.querySelector("#mobile-menu"));
  await noOverflow(page, "768px breakpoint");
  await page.getByRole("button", { name: "Open learning navigation", exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForFunction(() => !document.querySelector("#learning-drawer").open);
  await page.close();
} catch (error) { findings.push({ name: "breakpoints", error: error.message }); }
finally { await browser.close(); }

const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Shared header review</title>
<style>body{font:16px system-ui;margin:24px;color:#111827;background:#f9fafb}section{margin:32px 0}.shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0;padding:12px;background:white;border:1px solid #ddd;border-radius:12px}img{width:100%;height:420px;object-fit:contain;object-position:top}figcaption{margin:8px 0}a{color:#111827}@media(max-width:700px){.shots{grid-template-columns:1fr}}</style>
<h1>Shared header review</h1><p>Existing theme and page content. Guest mode, 900px viewport height. Contact is the existing Home section. Local contact service is not configured.</p>
${pages.map(([name]) => `<section><h2>${name}</h2><div class="shots">${screenshots.filter(shot => shot.name === name).map(shot => `<figure><figcaption>${shot.width}px — <a href="${shot.file}">viewport</a> · <a href="${shot.file.replace(".png", "-full.png")}">full page</a></figcaption><a href="${shot.file}"><img loading="lazy" src="${shot.file}" alt="${name} at ${shot.width}px"></a></figure>`).join("")}</div></section>`).join("")}</html>`;
fs.writeFileSync(path.join(out, "index.html"), gallery);
fs.writeFileSync(path.join(out, "results.json"), JSON.stringify({ findings, screenshots }, null, 2));
console.log(JSON.stringify({ findings, screenshots: screenshots.length }, null, 2));
if (findings.length) process.exitCode = 1;
