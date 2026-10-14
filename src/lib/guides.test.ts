import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { categoryLabel, sortGuides, validateGuides, type Guide, type GuidesData } from "./guides.ts";
import { resolveWithin } from "./safe-path.ts";

// Synthetic fixtures only. These are NOT real guides.
const guide = (over: Partial<Guide> = {}): Guide => ({
	slug: "example-guide",
	title: "Example guide (test fixture)",
	description: "A short original description.",
	category: "dsa",
	level: "beginner",
	path: "content/guides/example-guide.mdx",
	addedAt: "2026-10-01",
	...over,
});

test("a well-formed guide validates", () => {
	assert.deepEqual(validateGuides([guide({ updatedAt: "2026-10-05" })], () => true), []);
});

test("validateGuides reports every kind of problem", () => {
	const bad = [
		guide(),
		guide(), // duplicate
		guide({ slug: "Bad Slug" }),
		guide({ slug: "no-title", title: " " }),
		guide({ slug: "no-desc", description: "" }),
		guide({ slug: "bad-cat", category: "cooking" as Guide["category"] }),
		guide({ slug: "bad-level", level: "expert" as Guide["level"] }),
		guide({ slug: "bad-date", addedAt: "2026-02-30" }),
		guide({ slug: "bad-order", addedAt: "2026-10-05", updatedAt: "2026-10-01" }),
		guide({ slug: "missing-file", path: "content/guides/nope.mdx" }),
	];
	const problems = validateGuides(bad, (p) => p !== "content/guides/nope.mdx").join("\n");
	assert.match(problems, /duplicate slug/);
	assert.match(problems, /invalid slug/);
	assert.match(problems, /empty title/);
	assert.match(problems, /empty description/);
	assert.match(problems, /unknown category "cooking"/);
	assert.match(problems, /unknown level "expert"/);
	assert.match(problems, /addedAt must be a real/);
	assert.match(problems, /updatedAt is before addedAt/);
	assert.match(problems, /guide file not found/);
});

test("sortGuides puts the most recently touched first and does not mutate", () => {
	const a = guide({ slug: "a", title: "A", addedAt: "2026-09-01" });
	const b = guide({ slug: "b", title: "B", addedAt: "2026-08-01", updatedAt: "2026-10-01" });
	const c = guide({ slug: "c", title: "C", addedAt: "2026-09-15" });
	const input = [a, b, c];
	assert.deepEqual(sortGuides(input).map((g) => g.slug), ["b", "c", "a"]);
	assert.deepEqual(input.map((g) => g.slug), ["a", "b", "c"]);
});

test("categoryLabel maps slugs to readable names", () => {
	assert.equal(categoryLabel("system-design"), "System design");
	assert.equal(categoryLabel("dsa"), "DSA roadmaps");
});

test("the real guides.json is valid and every registered guide file exists inside src/content", () => {
	const root = path.resolve("src");
	const data = JSON.parse(fs.readFileSync(path.join(root, "data", "guides.json"), "utf8")) as GuidesData;
	const contentRoot = path.join(root, "content");
	const problems = validateGuides(data.guides, (p) => {
		const rel = p.replace(/^[/\\]+/, "").replace(/^src[/\\]/, "").replace(/^content[/\\]/, "");
		const full = resolveWithin(contentRoot, rel);
		return !!full && fs.existsSync(full);
	});
	assert.deepEqual(problems, []);
});

test("guideSitemapRoutes lists the index and readable guides only", async () => {
	const { guideSitemapRoutes } = await import("./guides.ts");
	const a = guide({ slug: "a", addedAt: "2026-09-01" });
	const b = guide({ slug: "b", addedAt: "2026-09-02", updatedAt: "2026-10-01" });
	assert.deepEqual(guideSitemapRoutes([]), []);
	assert.deepEqual(guideSitemapRoutes([a, b]), [
		{ path: "/guides" },
		{ path: "/guides/a", lastModified: "2026-09-01" },
		{ path: "/guides/b", lastModified: "2026-10-01" },
	]);
	assert.deepEqual(guideSitemapRoutes([a, b], (g) => g.slug === "b").map((r) => r.path), ["/guides", "/guides/b"]);
	assert.deepEqual(guideSitemapRoutes([a], () => false), []);
});
