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
	assert.deepEqual(dated, [
		{ path: "/dashboard/btech/cse/sem1/web", lastModified: "2026-10-05" },
		{ path: "/dashboard/btech/cse/sem1/web/u1", lastModified: "2026-09-01" },
		{ path: "/dashboard/btech/cse/sem1/web/u2", lastModified: "2026-10-05" },
	]);

	const undated = sitemapRoutes(sample([unit("u1")]));
	assert.deepEqual(undated, [{ path: "/dashboard/btech/cse/sem1/web" }, { path: "/dashboard/btech/cse/sem1/web/u1" }]);
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

test("sitemapRoutes skips units whose note cannot be read, and subjects with none left", () => {
	const data = sample([unit("u1", { addedAt: "2026-09-01" }), unit("u2", { addedAt: "2026-09-02" })]);
	const onlyU1 = sitemapRoutes(data, (u) => u.slug === "u1");
	assert.deepEqual(onlyU1.map((r) => r.path), ["/dashboard/btech/cse/sem1/web", "/dashboard/btech/cse/sem1/web/u1"]);
	assert.equal(onlyU1[0].lastModified, "2026-09-01");
	assert.deepEqual(sitemapRoutes(data, () => false), []);
});

test("validateCatalog rejects impossible calendar dates such as 30 February", () => {
	const problems = validateCatalog(sample([unit("u1", { addedAt: "2026-02-30" }), unit("u2", { updatedAt: "2026-04-31" })]), () => true).join("\n");
	assert.match(problems, /u1: addedAt must be a real/);
	assert.match(problems, /u2: updatedAt must be a real/);
});
