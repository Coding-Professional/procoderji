import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSiteUrl, resolveSiteUrl, buildSitemapEntries, DEFAULT_SITE_URL } from "./site.ts";

test("the default canonical domain is https://procoderji.com", () => {
	assert.equal(DEFAULT_SITE_URL, "https://procoderji.com");
});

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

test("resolveSiteUrl uses the env value when valid and the default otherwise", () => {
	assert.equal(resolveSiteUrl("https://staging.example.org/"), "https://staging.example.org");
	assert.equal(resolveSiteUrl(undefined), "https://procoderji.com");
	assert.equal(resolveSiteUrl(""), "https://procoderji.com");
	assert.equal(resolveSiteUrl("not a url"), "https://procoderji.com");
	assert.equal(resolveSiteUrl("javascript:alert(1)"), "https://procoderji.com");
});

test("sitemap lists static and content pages without query URLs or duplicates", () => {
	const entries = buildSitemapEntries("https://procoderji.com", [
		{ path: "/dashboard/btech/cse/sem1/web", lastModified: "2026-10-01" },
		{ path: "/dashboard/btech/cse/sem1/web?note=u1" },
		{ path: "/dashboard" },
	]);
	assert.deepEqual(entries, [
		{ url: "https://procoderji.com" },
		{ url: "https://procoderji.com/dashboard" },
		{ url: "https://procoderji.com/dashboard/btech/cse/sem1/web", lastModified: "2026-10-01" },
	]);
});

test("no sitemap URL mentions the retired .xyz domain", () => {
	const urls = buildSitemapEntries(resolveSiteUrl(undefined), []).map((e) => e.url);
	assert.ok(urls.every((u) => !u.includes("procoderji.xyz")));
});
