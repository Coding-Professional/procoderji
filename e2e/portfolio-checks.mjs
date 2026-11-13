import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CONTACT = "procoderji@gmail.com";
const EDITOR = "/learn/portfolio";
const ROOT = "/api/platform/portfolio";

async function until(condition, message, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(message);
}

/** Real frontend/BFF/API flows against the isolated test host, never a fake portfolio response. */
export async function runPortfolioChecks({ browser, base, backendOrigin }) {
  const findings = [];
  const output = path.resolve("e2e/.out");
  fs.mkdirSync(output, { recursive: true });

  async function fixture(route, body) {
    const response = await fetch(backendOrigin + "/__e2e__" + route, {
      method: "POST",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    assert.ok(response.ok, `Fixture ${route} failed (${response.status}): ${await response.text().then(text => response.ok ? "" : text)}`);
    return response;
  }

  async function newAccount() {
    const response = await fetch(backendOrigin + "/__e2e__/account", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    assert.ok(response.ok, `Account fixture failed (${response.status})`);
    const user = await response.json();
    assert.equal(typeof user.id, "string");
    return user;
  }

  async function ownerContext(user, viewport = { width: 1280, height: 900 }) {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    await context.addCookies([{ name: "procoderji.e2e-user", value: user.id,
      domain: new URL(base).hostname, path: "/api/platform", httpOnly: true,
      sameSite: "Lax", secure: new URL(base).protocol === "https:" }]);
    return context;
  }

  async function session(context, user) {
    const response = await context.request.get(base + "/api/platform/auth/session");
    assert.equal(response.status(), 200);
    const current = await response.json();
    assert.equal(current.user?.id, user.id, "Fixture cookie must authenticate the real account session");
    assert.equal(typeof current.csrfToken, "string");
    return current;
  }

  async function own(context, user) {
    const response = await context.request.get(base + ROOT, { headers: { "X-Account-Id": user.id } });
    assert.equal(response.status(), 200, `Owner read failed (${response.status()})`);
    return response.json();
  }

  async function write(context, user, action, body, expectedStatus = 200, method = "POST") {
    const current = await session(context, user);
    const response = await context.request.fetch(base + ROOT + action, {
      method, headers: { Origin: new URL(base).origin, "X-Account-Id": user.id,
        "X-CSRF-Token": current.csrfToken, "Content-Type": "application/json" }, data: body,
    });
    assert.equal(response.status(), expectedStatus, `${method} ${action || "/"} failed: ${await response.text()}`);
    return expectedStatus === 204 ? null : response.json();
  }

  async function publish(context, user, revision) {
    const workspace = await own(context, user);
    assert.equal(typeof workspace.policyVersion, "string");
    return write(context, user, "/publish", { revision, eligibility: { atLeast18: true, policyVersion: workspace.policyVersion } });
  }

  async function indexed(username) {
    const response = await fetch(base + "/sitemap.xml", { cache: "no-store" });
    assert.equal(response.status, 200);
    return (await response.text()).includes(`/u/${username}</loc>`);
  }

  async function publicPage(context, username, expectedStatus, expectedName) {
    const page = await context.newPage();
    const foreignRequests = new Set();
    page.on("request", request => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== new URL(base).origin) foreignRequests.add(url.origin);
    });
    // Next.js prefetch requests can outlive rendering; assert the loaded page's
    // status, content and privacy boundaries instead of waiting for network idle.
    const response = await page.goto(base + "/u/" + username, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(response?.status(), expectedStatus, `Public ${username} should return ${expectedStatus}`);
    if (expectedStatus === 200) {
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.getByRole("heading", { level: 1 }).innerText(), expectedName);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, "Public portfolio overflows horizontally");
      assert.equal(await page.locator('main a[target="_blank"]').evaluateAll(links => links.every(link => link.relList.contains("noopener") && link.relList.contains("noreferrer"))), true);
      const report = new URL(await page.getByRole("link", { name: "Report this page" }).getAttribute("href"));
      assert.equal(report.protocol, "mailto:");
      assert.equal(report.pathname, CONTACT);
      assert.ok(report.searchParams.get("body")?.includes(`/u/${username}`), "Report must include the canonical portfolio path");
    }
    assert.deepEqual([...foreignRequests], [], "Public portfolios must not make third-party requests");
    return page;
  }

  async function editor(page) {
    const response = await page.goto(base + EDITOR, { waitUntil: "load" });
    assert.equal(response?.status(), 200);
    await page.getByRole("heading", { name: "Portfolio builder", exact: true }).waitFor();
    await until(() => page.getByRole("button", { name: "Save draft", exact: true }).isEnabled(), "Authenticated editor did not become ready");
  }

  async function openSection(page, title) {
    const details = page.locator("details").filter({ has: page.locator("summary", { hasText: title }) }).first();
    if (!(await details.getAttribute("open") !== null)) await details.locator("summary").click();
  }

  async function run(vp, title, action) {
    const contexts = [];
    try {
      await action(contexts);
      console.log(`PASS  ${vp.padEnd(7)} portfolio: ${title}`);
    } catch (error) {
      const detail = String(error?.stack ?? error);
      findings.push({ kind: "portfolio", vp, url: EDITOR, detail: `${title}: ${detail}` });
      console.error(`FAIL  ${vp.padEnd(7)} portfolio: ${title}: ${String(error?.message ?? error)}`);
      const lastPage = contexts.flatMap(context => context.pages()).findLast(page => !page.isClosed());
      await lastPage?.screenshot({ path: path.join(output, `portfolio-${vp}-${title.replace(/[^a-z0-9]/gi, "-").slice(0, 60)}.png`), fullPage: true }).catch(() => {});
    } finally {
      for (const context of contexts) await context.close();
    }
  }

  const controlUser = await newAccount();
  const controlContext = await ownerContext(controlUser);
  await session(controlContext, controlUser);
  const originalPublishing = (await own(controlContext, controlUser)).publishingEnabled;
  await controlContext.close();

  try {
    await fixture("/publishing/true");
    for (const [vp, viewport, theme] of [["desktop", { width: 1280, height: 900 }, "simple"], ["mobile", { width: 390, height: 844 }, "developer"]]) {
      await run(vp, "save, claim, publish, review snapshots and unpublish", async contexts => {
        const user = await newAccount();
        const context = await ownerContext(user, viewport); contexts.push(context);
        const anonymous = await browser.newContext({ viewport, reducedMotion: "reduce" }); contexts.push(anonymous);
        const page = await context.newPage();
        await editor(page);
        const name = `${vp === "desktop" ? "Simple" : "Developer"} Student`;
        const username = `qa-${vp === "desktop" ? "desk" : "mob"}-${user.id.slice(0, 8)}`;
        await page.getByLabel("Name", { exact: true }).fill(name);
        await page.getByLabel("Headline", { exact: true }).fill("Building useful campus tools");
        await page.getByLabel("About you", { exact: true }).fill("I enjoy creating accessible learning tools with other students.");
        await page.getByLabel("Theme", { exact: true }).selectOption(theme);
        await openSection(page, "Skills");
        await page.getByRole("button", { name: "Add skill", exact: true }).click();
        await page.getByLabel("Skill 1", { exact: true }).fill("TypeScript");
        await openSection(page, "Projects");
        await page.getByRole("button", { name: "Add project", exact: true }).click();
        await page.getByLabel("Project title", { exact: true }).fill("Campus Planner");
        await page.getByLabel("Project link", { exact: true }).fill("https://github.com/example/campus-planner");
        await page.getByLabel("Project description", { exact: true }).fill("An accessible planner built with reviewed student feedback.");
        await page.getByRole("button", { name: "Add technology", exact: true }).click();
        await page.getByLabel("Technology 1", { exact: true }).fill("TypeScript");
        await page.getByRole("button", { name: "Add project", exact: true }).click();
        await page.getByLabel("Project title", { exact: true }).nth(1).fill("Study Tracker");
        await page.getByRole("button", { name: "Move project 2 up", exact: true }).click();
        assert.equal(await page.getByLabel("Project title", { exact: true }).first().inputValue(), "Study Tracker");
        await page.getByRole("button", { name: "Remove project 1", exact: true }).click();
        assert.equal(await page.getByLabel("Project title", { exact: true }).inputValue(), "Campus Planner");
        await openSection(page, "Education");
        await page.getByRole("button", { name: "Add education", exact: true }).click();
        await page.getByLabel("Institution", { exact: true }).fill("Example Institute");
        await page.getByLabel("Degree or qualification", { exact: true }).fill("B.Tech in Computer Science");
        await page.getByLabel("Education period", { exact: true }).fill("2023–2027");
        await page.getByLabel("Education details", { exact: true }).fill("Studying databases and web engineering.");
        await openSection(page, "Experience");
        await page.getByRole("button", { name: "Add experience", exact: true }).click();
        await page.getByLabel("Organization", { exact: true }).fill("Student Computing Club");
        await page.getByLabel("Role", { exact: true }).fill("Volunteer developer");
        await page.getByLabel("Experience period", { exact: true }).fill("2025–2026");
        await page.getByLabel("Experience description", { exact: true }).fill("Reviewed accessible campus exercises.");
        await openSection(page, "Achievements");
        await page.getByRole("button", { name: "Add achievement", exact: true }).click();
        await page.getByLabel("Achievement 1", { exact: true }).fill("Created a reviewed student project.");
        await openSection(page, "Links and optional public email");
        await page.getByLabel("GitHub profile", { exact: true }).fill("https://github.com/example");
        await page.getByLabel("LinkedIn profile", { exact: true }).fill("https://linkedin.com/in/example-student");
        await page.getByLabel("Personal website", { exact: true }).fill("https://example.com");
        await page.getByLabel("Public email", { exact: true }).fill("portfolio.contact@example.com");
        await page.getByRole("button", { name: "Save draft", exact: true }).click();
        await page.getByText(/Private draft saved\./).waitFor();
        await page.getByLabel("Public username", { exact: true }).fill(username);
        await page.getByRole("button", { name: "Check availability", exact: true }).click();
        await page.getByText(/This username is available/).waitFor();
        await page.getByRole("button", { name: "Claim username", exact: true }).click();
        await page.getByText(`Claimed address: /u/${username}`, { exact: true }).waitFor();
        assert.equal(await page.getByLabel("Public username", { exact: true }).isDisabled(), true);
        assert.equal(await page.getByRole("button", { name: "Publish portfolio", exact: true }).isDisabled(), true, "Age declaration must be explicit");
        await (await publicPage(anonymous, username, 404)).close();
        await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
        await page.getByRole("button", { name: "Publish portfolio", exact: true }).click();
        await page.getByText(/Your portfolio is published\./).waitFor();
        let visible = await publicPage(anonymous, username, 200, name);
        assert.equal(await visible.locator("[data-portfolio-theme]").getAttribute("data-portfolio-theme"), theme);
        assert.match(await visible.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
        assert.equal(await indexed(username), false, "Search visibility must default off");
        const html = await visible.content();
        assert.ok(!html.includes(user.id), "Public HTML leaked account identity");
        assert.ok(!user.email || !html.includes(user.email), "Public HTML leaked Google account email");
        await visible.screenshot({ path: path.join(output, `portfolio-${vp}-published.png`), fullPage: true });
        await page.screenshot({ path: path.join(output, `portfolio-${vp}-editor.png`), fullPage: true });
        await visible.close();
        await page.getByLabel("Name", { exact: true }).fill(`Private ${name}`);
        await page.getByRole("button", { name: "Save draft", exact: true }).click();
        await page.getByText(/Private draft saved\./).waitFor();
        visible = await publicPage(anonymous, username, 200, name);
        assert.ok(!(await visible.content()).includes(`Private ${name}`), "Saving a draft changed published data");
        await visible.close();
        await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
        await page.getByRole("button", { name: "Publish portfolio", exact: true }).click();
        await page.getByText(/Your portfolio is published\./).waitFor();
        await (await publicPage(anonymous, username, 200, `Private ${name}`)).close();
        await page.getByRole("button", { name: "Unpublish", exact: true }).click();
        await page.getByText(/Your portfolio is no longer public/).waitFor();
        await (await publicPage(anonymous, username, 404)).close();
        assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), `Private ${name}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, "Editor overflows horizontally");
        assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
      });
    }

    await run("desktop", "Markdown import fills the form without saving and reports unsafe input", async contexts => {
      const user = await newAccount();
      const context = await ownerContext(user); contexts.push(context);
      const page = await context.newPage(); await editor(page);
      await openSection(page, "Import a Markdown draft");
      const templateResponse = await fetch(base + "/templates/portfolio.md"); assert.equal(templateResponse.status, 200);
      const template = await templateResponse.text();
      const input = page.getByLabel("Choose a Markdown text file (up to 50 KiB)", { exact: true });
      const importErrors = page.getByRole("alert").filter({ has: page.getByText("The Markdown needs a correction", { exact: true }) });
      await input.setInputFiles({ name: "portfolio.md", mimeType: "text/markdown", buffer: Buffer.from(template) });
      await until(async () => await page.getByLabel("Name", { exact: true }).inputValue() === "Riya Student", "Import did not populate Name");
      assert.equal((await own(context, user)).portfolio, null, "Import must not autosave");
      await input.setInputFiles({ name: "extra-section.md", mimeType: "text/markdown", buffer: Buffer.from(template + "\n## Unknown section\nDo not drop me.\n") });
      await page.getByText("The Markdown needs a correction", { exact: true }).waitFor();
      assert.match(await importErrors.innerText(), /unknown/i);
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Riya Student");
      await input.setInputFiles({ name: "unsafe.md", mimeType: "text/markdown", buffer: Buffer.from(template.replace("## About", "## About\n<script>window.__portfolioPwned=true</script>")) });
      await until(async () => /HTML|JSX|plain text/i.test(await importErrors.innerText()), "Unsafe markup should be rejected");
      assert.equal(await page.evaluate(() => typeof window.__portfolioPwned), "undefined");
      await input.setInputFiles({ name: "too-big.md", mimeType: "text/markdown", buffer: Buffer.from("x".repeat(50 * 1024 + 1)) });
      await page.getByText("Choose a Markdown text file no larger than 50 KiB.", { exact: true }).waitFor();
      assert.equal((await own(context, user)).portfolio, null);
      assert.equal(await page.getByLabel("Optional AI prompt", { exact: true }).inputValue().then(text => text.includes("Do not invent")), true);
    });

    await run("desktop", "delayed Markdown files preserve newer edits and newer file selections", async contexts => {
      const user = await newAccount();
      const context = await ownerContext(user); contexts.push(context);
      const page = await context.newPage(); await editor(page);
      await openSection(page, "Import a Markdown draft");
      const templateResponse = await fetch(base + "/templates/portfolio.md"); assert.equal(templateResponse.status, 200);
      const template = await templateResponse.text();
      await page.evaluate(() => {
        const read = File.prototype.arrayBuffer;
        window.__portfolioFileReads = {};
        File.prototype.arrayBuffer = function () {
          if (!this.name.startsWith("deferred-")) return read.call(this);
          return new Promise((resolve, reject) => {
            const content = read.call(this);
            window.__portfolioFileReads[this.name] = async () => {
              try { resolve(await content); } catch (error) { reject(error); }
            };
          });
        };
      });
      const input = page.getByLabel("Choose a Markdown text file (up to 50 KiB)", { exact: true });
      const select = (filename, name) => input.setInputFiles({ name: filename, mimeType: "text/markdown",
        buffer: Buffer.from(template.replace('name: "Riya Student"', `name: "${name}"`)) });
      const release = filename => page.evaluate(async name => {
        await window.__portfolioFileReads[name]();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      }, filename);
      let replacementQuestions = 0;
      let acceptReplacement = false;
      page.on("dialog", async dialog => {
        replacementQuestions++;
        if (acceptReplacement) await dialog.accept(); else await dialog.dismiss();
      });
      await select("deferred-edit.md", "Delayed file");
      await page.getByLabel("Name", { exact: true }).fill("New unsaved edit");
      await release("deferred-edit.md");
      assert.equal(replacementQuestions, 1, "A file read started from a clean form must still confirm edits made while reading");
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "New unsaved edit");
      await select("deferred-older.md", "Older file");
      await select("deferred-newer.md", "Latest file");
      acceptReplacement = true;
      await release("deferred-newer.md");
      await until(async () => await page.getByLabel("Name", { exact: true }).inputValue() === "Latest file", "The latest file selection was not imported");
      assert.equal(replacementQuestions, 2);
      await release("deferred-older.md");
      assert.equal(replacementQuestions, 2, "An obsolete file selection must not ask to replace newer imported data");
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Latest file");
      assert.equal((await own(context, user)).portfolio, null, "Delayed imports must not save private drafts automatically");
    });

    await run("desktop", "internal navigation confirms before discarding unsaved portfolio edits", async contexts => {
      const user = await newAccount();
      const context = await ownerContext(user); contexts.push(context);
      const page = await context.newPage(); await editor(page);
      await page.getByLabel("Name", { exact: true }).fill("Keep these unsaved edits");
      page.once("dialog", dialog => dialog.dismiss());
      await page.getByRole("link", { name: "Placement practice", exact: true }).click();
      assert.equal(new URL(page.url()).pathname, EDITOR);
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Keep these unsaved edits");
      page.once("dialog", dialog => dialog.accept());
      await Promise.all([
        page.waitForURL(url => url.pathname === "/practice"),
        page.getByRole("link", { name: "Placement practice", exact: true }).click(),
      ]);
      assert.equal(new URL(page.url()).pathname, "/practice");
    });

    await run("desktop", "moderation and search visibility stay fresh after cached public reads", async contexts => {
      const user = await newAccount(); const context = await ownerContext(user); contexts.push(context);
      const anonymous = await browser.newContext(); contexts.push(anonymous);
      const username = `qa-review-${user.id.slice(0, 8)}`;
      let record = (await write(context, user, "/draft", { data: { name: "Moderation Student", headline: "Learning in public", theme: "simple" }, searchVisible: true, revision: null })).portfolio;
      record = (await write(context, user, "/username", { username, revision: record.revision })).portfolio;
      record = (await publish(context, user, record.revision)).portfolio;
      let page = await publicPage(anonymous, username, 200, "Moderation Student");
      assert.ok(!/noindex/.test(await page.locator('meta[name="robots"]').getAttribute("content")));
      assert.ok((await page.locator('link[rel="canonical"]').getAttribute("href")).endsWith(`/u/${username}`));
      assert.equal(await indexed(username), true);
      await page.close();
      await (await publicPage(anonymous, username, 200, "Moderation Student")).close();
      await fixture(`/moderate/${username}/suspend`);
      await (await publicPage(anonymous, username, 404)).close();
      assert.equal(await indexed(username), false, "Suspended pages remained in the sitemap");
      const owner = await context.newPage(); await editor(owner);
      assert.equal(await owner.getByRole("button", { name: "Publish portfolio", exact: true }).isDisabled(), true);
      assert.equal(await owner.getByRole("button", { name: "Delete portfolio", exact: true }).isDisabled(), true);
      await owner.getByRole("button", { name: "Unpublish", exact: true }).click();
      await owner.getByText(/Your portfolio is no longer public/).waitFor();
      assert.equal((await own(context, user)).portfolio.status, "suspended", "Unpublishing bypassed suspension");
      await fixture(`/moderate/${username}/restore`);
      await (await publicPage(anonymous, username, 404)).close();
      record = (await own(context, user)).portfolio;
      record = (await publish(context, user, record.revision)).portfolio;
      await (await publicPage(anonymous, username, 200, "Moderation Student")).close();
      record = (await write(context, user, "/draft", { data: record.data, searchVisible: false, revision: record.revision })).portfolio;
      assert.equal(await indexed(username), true, "A private draft changed published search visibility");
      record = (await publish(context, user, record.revision)).portfolio;
      page = await publicPage(anonymous, username, 200, "Moderation Student");
      assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
      assert.equal(await indexed(username), false, "Opt-out did not remove a page from the sitemap");
      await page.close();
      await write(context, user, "", { revision: record.revision }, 204, "DELETE");
      await (await publicPage(anonymous, username, 404)).close();
    });

    await run("desktop", "publication gate hides existing pages and private owner drafts remain usable", async contexts => {
      const user = await newAccount(); const context = await ownerContext(user); contexts.push(context);
      const anonymous = await browser.newContext(); contexts.push(anonymous);
      const username = `qa-gate-${user.id.slice(0, 8)}`;
      let record = (await write(context, user, "/draft", { data: { name: "Gate Student", headline: "A private working draft" }, searchVisible: true, revision: null })).portfolio;
      record = (await write(context, user, "/username", { username, revision: record.revision })).portfolio;
      const missingDeclaration = await write(context, user, "/publish", { revision: record.revision }, 400);
      assert.ok(missingDeclaration.error);
      record = (await publish(context, user, record.revision)).portfolio;
      await (await publicPage(anonymous, username, 200, "Gate Student")).close();
      try {
        await fixture("/publishing/false");
        await (await publicPage(anonymous, username, 404)).close();
        assert.equal(await indexed(username), false);
        const page = await context.newPage(); await editor(page);
        await page.getByText(/Public publishing is not available on this deployment/).waitFor();
        assert.equal(await page.getByRole("button", { name: "Publish portfolio", exact: true }).isDisabled(), true);
        assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Gate Student");
      } finally { await fixture("/publishing/true"); }
    });

    await run("desktop", "changing accounts clears private editor details", async contexts => {
      const user = await newAccount(); const nextUser = await newAccount();
      const context = await ownerContext(user); contexts.push(context);
      await write(context, user, "/draft", { data: { name: "Private Owner One", headline: "Only my draft" }, searchVisible: false, revision: null });
      const page = await context.newPage(); await editor(page);
      assert.equal(await page.getByLabel("Name", { exact: true }).inputValue(), "Private Owner One");
      await context.addCookies([{ name: "procoderji.e2e-user", value: nextUser.id, domain: new URL(base).hostname, path: "/api/platform", httpOnly: true, sameSite: "Lax", secure: new URL(base).protocol === "https:" }]);
      await page.evaluate(() => window.dispatchEvent(new Event("procoderji-auth-change")));
      await until(async () => await page.getByLabel("Name", { exact: true }).inputValue() === "", "Previous account draft remained in the editor");
      assert.ok(!(await page.locator("main").innerText()).includes("Private Owner One"));
      const wrongOwner = await context.request.get(base + ROOT, { headers: { "X-Account-Id": user.id } });
      assert.equal(wrongOwner.status(), 409);
    });

    await run("guest", "guests can preview while private APIs and unpublished pages stay protected", async contexts => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(context);
      const page = await context.newPage(); await page.goto(base + EDITOR, { waitUntil: "load" });
      await page.getByRole("heading", { name: "Try the editor, then sign in to save", exact: true }).waitFor();
      await page.getByLabel("Name", { exact: true }).fill("Guest preview");
      assert.equal(await page.getByRole("button", { name: "Save draft", exact: true }).isDisabled(), true);
      assert.equal(await context.request.get(base + ROOT).then(response => response.status()), 401);
      await (await publicPage(context, "qa-unknown-student", 404)).close();
      await (await publicPage(context, "admin", 404)).close();
    });
  } finally {
    await fixture(`/publishing/${originalPublishing ? "true" : "false"}`);
  }
  return findings;
}
