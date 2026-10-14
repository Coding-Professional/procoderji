import { test } from "node:test";
import assert from "node:assert/strict";
import { readingTimeMinutes, formatIsoDate } from "./reading.ts";
import { articleJsonLd, breadcrumbJsonLd, jsonLdString } from "./jsonld.ts";

test("reading time is at least one minute and ignores code fences", () => {
	assert.equal(readingTimeMinutes(""), 1);
	assert.equal(readingTimeMinutes("word ".repeat(200)), 1);
	assert.equal(readingTimeMinutes("word ".repeat(201)), 2);
	assert.equal(readingTimeMinutes("word ".repeat(100) + "\n```js\n" + "code ".repeat(5000) + "\n```\n"), 1);
});

test("formatIsoDate formats real dates and rejects everything else", () => {
	assert.equal(formatIsoDate("2026-10-05"), "5 Oct 2026");
	assert.equal(formatIsoDate("2026-12-31"), "31 Dec 2026");
	assert.equal(formatIsoDate("2026-02-30"), null);
	assert.equal(formatIsoDate("2026-13-01"), null);
	assert.equal(formatIsoDate("5 Oct 2026"), null);
	assert.equal(formatIsoDate(undefined), null);
});

test("breadcrumb JSON-LD numbers items and builds absolute URLs", () => {
	const ld = breadcrumbJsonLd("https://procoderji.com", [
		{ name: "Dashboard", path: "/dashboard" },
		{ name: "CSE", path: "/dashboard/btech/cse" },
	]);
	assert.equal(ld["@type"], "BreadcrumbList");
	assert.deepEqual(
		ld.itemListElement.map((i) => [i.position, i.item]),
		[
			[1, "https://procoderji.com/dashboard"],
			[2, "https://procoderji.com/dashboard/btech/cse"],
		]
	);
});

test("article JSON-LD only includes the fields that are known", () => {
	const minimal = articleJsonLd("https://procoderji.com", { headline: "H", path: "/p", authorName: "A" });
	assert.ok(!("datePublished" in minimal) && !("dateModified" in minimal) && !("description" in minimal));
	const full = articleJsonLd("https://procoderji.com", {
		headline: "H",
		description: "D",
		path: "/p",
		authorName: "A",
		datePublished: "2026-10-01",
		dateModified: "2026-10-05",
	});
	assert.equal(full.dateModified, "2026-10-05");
	assert.equal(full.mainEntityOfPage, "https://procoderji.com/p");
});

test("JSON-LD serialisation cannot close the script tag", () => {
	const s = jsonLdString({ headline: "</script><script>alert(1)</script>" });
	assert.ok(!s.includes("</script>"));
	assert.equal(JSON.parse(s).headline, "</script><script>alert(1)</script>");
});
