import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sitemapRoutes, validateCatalog } from "./catalog.ts";
import { resolveWithin } from "./safe-path.ts";
import type { CoursesData } from "../types/global";

const unit = (slug: string, extra: object = {}) => ({ slug, title: slug.toUpperCase(), path: `content/${slug}.mdx`, ...extra });

const sample = (units: ReturnType<typeof unit>[]): CoursesData => ({
	courses: [
		{
			slug: "btech",
			title: "B.Tech",
			branches: [
				{
					slug: "cse",
					title: "CSE",
					semesters: [{ slug: "sem1", title: "Semester 1", subjects: [{ slug: "web", title: "Web", units }] }],
				},
			],
		},
	],
});

test("sitemapRoutes uses real unit dates and never invents a lastModified", () => {
	const dated = sitemapRoutes(sample([unit("u1", { addedAt: "2026-09-01" }), unit("u2", { addedAt: "2026-09-02", updatedAt: "2026-10-05" })]));
	assert.deepEqual(dated, [{ path: "/dashboard/btech/cse/sem1/web", lastModified: "2026-10-05" }]);

	const undated = sitemapRoutes(sample([unit("u1")]));
	assert.deepEqual(undated, [{ path: "/dashboard/btech/cse/sem1/web" }]);
});

test("validateCatalog accepts a well-formed catalogue", () => {
	assert.deepEqual(validateCatalog(sample([unit("u1", { addedAt: "2026-09-01", updatedAt: "2026-09-01" })]), () => true), []);
});

test("validateCatalog reports duplicate/invalid slugs, empty titles, bad dates and missing files", () => {
	const bad = sample([
		unit("u1"),
		unit("u1"),
		unit("Bad Slug"),
		{ ...unit("u3"), title: " " },
		unit("u4", { addedAt: "2026-13-45" }),
		unit("u5", { addedAt: "2026-10-02", updatedAt: "2026-10-01" }),
	]);
	const problems = validateCatalog(bad, () => false).join("\n");
	assert.match(problems, /duplicate slug "u1"/);
	assert.match(problems, /invalid slug "Bad Slug"/);
	assert.match(problems, /u3: empty title/);
	assert.match(problems, /u4: addedAt must be a real/);
	assert.match(problems, /u5: updatedAt is before addedAt/);
	assert.match(problems, /note file not found/);
});

test("the real courses.json is valid and every registered note file exists inside src/content", () => {
	const root = path.resolve("src");
	const data = JSON.parse(fs.readFileSync(path.join(root, "data", "courses.json"), "utf8")) as CoursesData;
	const contentRoot = path.join(root, "content");
	const problems = validateCatalog(data, (unitPath) => {
		const rel = unitPath.replace(/^[/\\]+/, "").replace(/^src[/\\]/, "").replace(/^content[/\\]/, "");
		const full = resolveWithin(contentRoot, rel);
		return !!full && fs.existsSync(full);
	});
	assert.deepEqual(problems, []);
});
