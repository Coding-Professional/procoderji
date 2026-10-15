import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SITE_URL } from "./site.ts";

const ROOT = path.resolve(".");

/** Active site code and config: everything that ships or configures the build (tests excluded). */
function activeFiles(): string[] {
	const out: string[] = [];
	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (/\.(tsx?|json|mdx?|css|mjs|cjs)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) out.push(full);
		}
	};
	walk(path.join(ROOT, "src"));
	for (const f of ["next.config.ts", "package.json", "README.md"]) out.push(path.join(ROOT, f));
	return out;
}

// Domains that must never appear in active code: the retired .xyz domain, a different
// brand's domain from old planning files, and an explicit www host (the canonical is the apex).
const FORBIDDEN = [/procoderji\.xyz/i, /rgpvnotes/i, /www\.procoderji\.com/i];

test("the canonical domain is the apex https://procoderji.com", () => {
	assert.equal(DEFAULT_SITE_URL, "https://procoderji.com");
});

test("no retired or foreign domains appear in active code and config", () => {
	const hits: string[] = [];
	for (const file of activeFiles()) {
		const text = fs.readFileSync(file, "utf8");
		for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${path.relative(ROOT, file)}: ${re}`);
	}
	assert.deepEqual(hits, []);
});

test("any hard-coded procoderji.com URL in active code is the canonical apex", () => {
	const bad: string[] = [];
	for (const file of activeFiles()) {
		const text = fs.readFileSync(file, "utf8");
		for (const m of text.matchAll(/https?:\/\/[a-z0-9.-]*procoderji\.com[^\s"'`)]*/gi)) {
			const url = m[0].replace(/[.,;:]+$/, ""); // drop sentence punctuation that followed the URL
			if (!/^https:\/\/procoderji\.com(\/|$)/.test(url)) bad.push(`${path.relative(ROOT, file)}: ${url}`);
		}
	}
	assert.deepEqual(bad, []);
});
