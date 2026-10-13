import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSiteUrl, buildSitemapEntries } from "./site.ts";

test("parseSiteUrl normalises to a bare origin", () => {
	assert.equal(parseSiteUrl("https://example.org"), "https://example.org");
	assert.equal(parseSiteUrl("https://example.org/"), "https://example.org");
	assert.equal(parseSiteUrl("  https://example.org/some/path?x=1#h "), "https://example.org");
	assert.equal(parseSiteUrl("http://localhost:3000"), "http://localhost:3000");
});

test("parseSiteUrl rejects unset, malformed and unsafe values", () => {
	assert.equal(parseSiteUrl(undefined), null);
	assert.equal(parseSiteUrl(""), null);
	assert.equal(parseSiteUrl("example.org"), null);
	assert.equal(parseSiteUrl("javascript:alert(1)"), null);
	assert.equal(parseSiteUrl("ftp://example.org"), null);
	assert.equal(parseSiteUrl("https://user:pw@example.org"), null);
});

test("sitemap is empty until the canonical domain is configured", () => {
	assert.deepEqual(buildSitemapEntries(null, ["/dashboard/btech/cse/sem1/web"]), []);
});

test("sitemap lists static pages and content pages, without query URLs or duplicates", () => {
	const entries = buildSitemapEntries("https://example.org", [
		"/dashboard/btech/cse/sem1/web",
		"/dashboard/btech/cse/sem1/web?note=u1",
		"/dashboard",
	]);
	assert.deepEqual(
		entries.map((e) => e.url),
		[
			"https://example.org",
			"https://example.org/dashboard",
			"https://example.org/dashboard/btech/cse/sem1/web",
		]
	);
});
