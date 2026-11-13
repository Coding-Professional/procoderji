import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Route the external widget only inside browser tests. The real BFF, API and SQLite remain active.
export async function installCaptchaFixture(context) {
  await context.route("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", route => route.fulfill({
    contentType: "application/javascript",
    body: `window.turnstile = {
      render(container, options) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = 'Complete test security check';
        button.style.cssText = 'width:100%;min-height:65px;border:1px solid #ddd;border-radius:8px';
        button.onclick = () => options.callback('browser-fixture-valid-' + crypto.randomUUID());
        container.append(button);
        window.__contactWidget = {
          expire: () => options['expired-callback'](),
          invalid: () => options.callback('browser-fixture-invalid')
        };
        return 'test-widget';
      },
      remove() { document.querySelector('[aria-label="Security check"]')?.replaceChildren(); }
    };`,
  }));
}

export async function runContactChecks({ browser, base }) {
  const findings = [];
  for (const width of [320, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    await installCaptchaFixture(context);
    const page = await context.newPage();
    try {
      await page.goto(base + "/", { waitUntil: "networkidle" });
      const send = page.getByRole("button", { name: "Send message", exact: true });
      const solve = () => page.getByRole("button", { name: "Complete test security check", exact: true }).click();
      const fill = async () => {
        await page.fill("#contact-name", "Browser test student");
        await page.fill("#contact-email", "browser@example.test");
        await page.fill("#contact-subject", "Notes request");
        await page.fill("#contact-message", "Please add more notes.");
      };
      await fill();
      assert(await send.isDisabled(), "CAPTCHA required");
      await solve();
      await page.evaluate(() => window.__contactWidget.expire());
      await page.waitForFunction(() => document.querySelector('#contact button[type="submit"]')?.disabled);
      assert(await send.isDisabled(), "expiry disables sending");
      await solve();
      const accepted = page.waitForResponse(response => response.url().endsWith("/api/platform/contact") && response.request().method() === "POST");
      await send.click();
      assert.equal((await accepted).status(), 201, "real backend confirms database commit");
      await page.getByRole("status").filter({ hasText: "Your message has been received" }).waitFor();
      assert.equal(await page.inputValue("#contact-message"), "", "confirmed success clears fields");
      assert(await send.isDisabled(), "a fresh CAPTCHA is required for another message");
      assert.equal(new URL(page.url()).origin, base, "submission stays on the website");
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");

      if (width === 1280) {
        await fill();
        await page.evaluate(() => window.__contactWidget.invalid());
        await send.click();
        await page.getByRole("alert").filter({ hasText: "expired or failed" }).waitFor();
        assert.equal(await page.inputValue("#contact-message"), "Please add more notes.");
        assert(await send.isDisabled(), "failed token must be replaced");
        // Exercise an unavailable service without modifying the production API's behavior.
        await page.route("**/api/platform/contact", route => route.fulfill({ status: 503,
          contentType: "application/json", body: JSON.stringify({ error: "Your message could not be saved right now. Please try again later." }) }));
        await solve(); await send.click();
        await page.getByRole("alert").filter({ hasText: "could not be saved" }).waitFor();
        assert.equal(await page.inputValue("#contact-message"), "Please add more notes.");
      }
    } catch (error) {
      findings.push({ vp: String(width), url: "/#contact", kind: "contact", detail: String(error.message ?? error) });
    } finally { await context.close(); }
  }
  return findings;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || "chrome", headless: true });
  try {
    const findings = await runContactChecks({ browser, base: process.env.BASE || "http://localhost:3150" });
    console.log(JSON.stringify({ contactFindings: findings }, null, 2));
    if (findings.length) process.exitCode = 1;
  } finally { await browser.close(); }
}
