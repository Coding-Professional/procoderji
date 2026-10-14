// Launch checks against the REAL production build (no fixtures, so it tests what ships).
// Builds, starts the server, crawls every internal link from "/" and everything in the sitemap,
// and checks SEO and link integrity. Usage: npm run launch-check
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = process.env.E2E_PORT || "3180";
const NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const BASE = `http://localhost:${PORT}`;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://procoderji.com"; // canonical origin the build uses

const problems = [];
const bad = (url, msg) => problems.push(`${url}  ${msg}`);

let server = null;
const stop = () => {
	if (server?.pid) spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
	if (server?.pid && process.platform !== "win32") try { process.kill(server.pid); } catch {}
};
process.on("SIGINT", () => { stop(); process.exit(130); });

const get = async (p) => {
	const res = await fetch(BASE + p, { redirect: "manual" });
	return { status: res.status, location: res.headers.get("location"), text: res.status < 400 || res.status === 404 ? await res.text() : "", headers: res.headers };
};

const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1];
const metas = (html) => [...html.matchAll(/<meta\s[^>]*>/gi)].map((m) => m[0]);
const metaContent = (html, key, val) => {
	const t = metas(html).find((m) => attr(m, key) === val);
	return t ? attr(t, "content") : undefined;
};
const decode = (s) => s?.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

function analyse(html) {
	const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1]);
	const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0];
	return {
		title,
		description: decode(metaContent(html, "name", "description")),
		robots: metaContent(html, "name", "robots"),
		ogUrl: metaContent(html, "property", "og:url"),
		canonical: canonical ? attr(canonical, "href") : undefined,
		lang: html.match(/<html[^>]*lang="([^"]*)"/i)?.[1],
		viewport: metaContent(html, "name", "viewport"),
		ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
		links: [...html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>/gi)].map((m) => ({ tag: m[0], href: decode(m[1]) })),
		ld: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]),
	};
}

let code = 1;
try {
	const build = spawnSync(process.execPath, [NEXT, "build"], { cwd: ROOT, stdio: "inherit" });
	if (build.status !== 0) throw new Error("next build failed");
	server = spawn(process.execPath, [NEXT, "start", "-p", PORT], { cwd: ROOT, stdio: "ignore" });
	for (let i = 0; i < 40; i++) {
		try { if ((await fetch(BASE)).ok) break; } catch {}
		await new Promise((r) => setTimeout(r, 500));
	}

	// ---------- robots.txt ----------
	const robots = await get("/robots.txt");
	if (robots.status !== 200) bad("/robots.txt", `status ${robots.status}`);
	if (!/^Allow:\s*\/\s*$/m.test(robots.text)) bad("/robots.txt", "missing 'Allow: /'");
	if (!robots.text.includes(`Sitemap: ${SITE}/sitemap.xml`)) bad("/robots.txt", `missing 'Sitemap: ${SITE}/sitemap.xml'`);
	if (/rgpvnotes|procoderji\.xyz|www\./i.test(robots.text)) bad("/robots.txt", "contains a stale domain");

	// ---------- sitemap ----------
	const sm = await get("/sitemap.xml");
	if (sm.status !== 200) bad("/sitemap.xml", `status ${sm.status}`);
	const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	if (new Set(locs).size !== locs.length) bad("/sitemap.xml", "duplicate <loc> entries");
	const sitemapPaths = new Set();
	for (const loc of locs) {
		if (!(loc === SITE || loc.startsWith(SITE + "/"))) { bad("/sitemap.xml", `URL not on the canonical origin: ${loc}`); continue; }
		sitemapPaths.add(loc === SITE ? "/" : loc.slice(SITE.length));
	}

	// ---------- crawl: "/" + sitemap + legal pages, following internal links ----------
	const queue = ["/", ...sitemapPaths, "/about", "/privacy", "/terms", "/disclaimer", "/copyright", "/dashboard"];
	const seen = new Map(); // path -> analysis | null (non-200)
	const anchorChecks = [];
	const linkTargets = new Set();

	while (queue.length) {
		const p = queue.shift();
		if (seen.has(p)) continue;
		const res = await get(p);
		if (res.status >= 300 && res.status < 400) { // follow one redirect level
			seen.set(p, null);
			const to = res.location ? new URL(res.location, BASE).pathname + new URL(res.location, BASE).search : null;
			if (to) queue.push(to);
			continue;
		}
		if (res.status !== 200) { seen.set(p, null); bad(p, `status ${res.status} (expected 200)`); continue; }
		const a = analyse(res.text);
		seen.set(p, a);
		for (const l of a.links) {
			if (l.href.startsWith("#")) { anchorChecks.push({ page: p, id: l.href.slice(1) }); continue; }
			if (/^https?:\/\//i.test(l.href)) {
				if (/target="_blank"/i.test(l.tag) && !/rel="[^"]*noopener/i.test(l.tag)) bad(p, `external link without rel=noopener: ${l.href}`);
				if (/procoderji\.xyz|rgpvnotes/i.test(l.href)) bad(p, `stale domain link: ${l.href}`);
				continue;
			}
			if (l.href.startsWith("mailto:") || l.href.startsWith("tel:")) continue;
			if (l.href.startsWith("/")) { const clean = l.href.split("#")[0]; linkTargets.add(clean); queue.push(clean); }
		}
	}
	for (const { page, id } of anchorChecks) {
		const a = seen.get(page);
		if (a && id && !a.ids.has(id)) bad(page, `in-page link #${id} has no matching element id`);
	}

	// ---------- per-page SEO ----------
	const titles = new Map();
	for (const [p, a] of seen) {
		if (!a) continue;
		if (a.lang !== "en") bad(p, `html lang is "${a.lang}"`);
		if (!a.viewport) bad(p, "missing viewport meta");
		if (!a.title) bad(p, "missing <title>");
		const noindex = /noindex/i.test(a.robots ?? "");
		const inSitemap = sitemapPaths.has(p);
		if (noindex && inSitemap) bad(p, "is noindex but listed in the sitemap");
		if (inSitemap && !noindex) { /* checked below */ }
		if (!noindex) {
			// Query-string variants (e.g. /?branch=cse) must canonicalise to their clean path.
			const pathname = p.split("?")[0];
			const want = pathname === "/" ? SITE : SITE + pathname;
			if (a.canonical !== want) bad(p, `canonical is "${a.canonical}" (expected ${want})`);
			if (a.ogUrl && a.ogUrl !== want) bad(p, `og:url is "${a.ogUrl}" (expected ${want})`);
			if (!a.description || a.description.length < 40 || a.description.length > 200) bad(p, `description length ${a.description?.length ?? 0} (expected 40-200)`);
			// Titles must be unique per canonical page, so query variants of one page do not count.
			if (a.title && !p.includes("?")) titles.set(a.title, [...(titles.get(a.title) ?? []), p]);
		} else if (a.canonical) {
			bad(p, "noindex page should not declare a canonical");
		}
		for (const raw of a.ld) { try { JSON.parse(raw); } catch { bad(p, "invalid JSON-LD"); } }
	}
	for (const [t, ps] of titles) if (ps.length > 1) bad(ps.join(", "), `duplicate title: "${t}"`);
	for (const p of sitemapPaths) {
		const a = seen.get(p);
		if (!a) bad(p, "listed in the sitemap but did not return 200");
	}

	// ---------- empty content stays hidden ----------
	const mustBeNoindex = ["/dashboard/btech/cse/sem1", "/dashboard/btech/cse/sem8", "/dashboard/btech/aiml/sem3", "/courses"];
	for (const p of mustBeNoindex) {
		const res = await get(p);
		if (res.status === 200 && !/noindex/i.test(analyse(res.text).robots ?? "")) bad(p, "empty/duplicate page is indexable (should be noindex)");
		if (sitemapPaths.has(p)) bad(p, "empty/duplicate page is in the sitemap");
	}
	for (const p of ["/guides", "/jobs"]) {
		const res = await get(p);
		if (res.status === 200) {
			if (!/noindex/i.test(analyse(res.text).robots ?? "")) bad(p, "empty section is indexable (should be noindex)");
			if (sitemapPaths.has(p)) bad(p, "empty section is in the sitemap");
		}
		if ([...linkTargets].includes(p)) bad(p, "empty section is linked from the site navigation");
	}
	const notFound = await get("/this/page/does/not/exist");
	if (notFound.status !== 404) bad("/this/page/does/not/exist", `expected 404, got ${notFound.status}`);

	// ---------- assets ----------
	for (const p of ["/favicon.ico", "/logo.svg", "/og.png"]) {
		const r = await fetch(BASE + p);
		if (!r.ok) bad(p, `asset status ${r.status}`);
	}
	// ---------- response headers ----------
	const home = await get("/");
	for (const h of ["x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"]) {
		if (!home.headers.get(h)) bad("/", `missing response header ${h}`);
	}

	console.log(`\nCrawled ${[...seen.values()].filter(Boolean).length} pages; sitemap lists ${sitemapPaths.size}; ${linkTargets.size} distinct internal link targets.`);
	console.log("Sitemap paths:", [...sitemapPaths].join(", ") || "(none)");
	console.log("Indexable pages:", [...seen].filter(([, a]) => a && !/noindex/i.test(a.robots ?? "")).map(([p]) => p).join(", "));
	if (problems.length) {
		console.log(`\n${problems.length} problem(s):`);
		for (const m of problems) console.log("  - " + m);
	} else {
		console.log("\nNo problems found.");
	}
	code = problems.length ? 1 : 0;
} catch (e) {
	console.error(String(e.message ?? e));
} finally {
	stop();
}
process.exit(code);
