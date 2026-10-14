import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolvePath, countSubjects, countUnits, contentRoutes, findUnit, siblingUnits, breadcrumbsFor } from "./catalog.ts";
import { resolveWithin } from "./safe-path.ts";
import type { CoursesData } from "../types/global";

const data: CoursesData = {
	courses: [
		{
			slug: "btech",
			title: "B.Tech",
			branches: [
				{
					slug: "cse",
					title: "CSE",
					semesters: [
						{
							slug: "sem1",
							title: "Semester 1",
							subjects: [{ slug: "web", title: "Web", units: [{ slug: "u1", title: "U1", path: "a.mdx" }] }],
						},
						{ slug: "sem2", title: "Semester 2", subjects: [] },
					],
				},
			],
		},
	],
};

test("resolvePath resolves every depth", () => {
	assert.equal(resolvePath(data, [])?.type, "root");
	assert.equal(resolvePath(data, ["btech"])?.type, "course");
	assert.equal(resolvePath(data, ["btech", "cse"])?.type, "branch");
	assert.equal(resolvePath(data, ["btech", "cse", "sem1"])?.type, "semester");
	assert.equal(resolvePath(data, ["btech", "cse", "sem1", "web"])?.type, "subject");
	const unit = resolvePath(data, ["btech", "cse", "sem1", "web", "u1"]);
	assert.equal(unit?.type, "unit");
	assert.equal(unit?.type === "unit" ? unit.unit.title : "", "U1");
});

test("resolvePath rejects unknown slugs and over-deep paths", () => {
	assert.equal(resolvePath(data, ["mtech"]), null);
	assert.equal(resolvePath(data, ["btech", "it"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem9"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem2", "nope"]), null);
	assert.equal(resolvePath(data, ["btech", "year3", "sem5", "ml"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem1", "web", "extra"]), null); // unknown unit
	assert.equal(resolvePath(data, ["btech", "cse", "sem1", "web", "u1", "more"]), null); // too deep
});

test("siblingUnits returns neighbours without wrapping", () => {
	const subject = { slug: "s", title: "S", units: ["a", "b", "c"].map((slug) => ({ slug, title: slug, path: slug })) };
	assert.deepEqual(siblingUnits(subject, "a"), { prev: undefined, next: subject.units[1] });
	assert.deepEqual(siblingUnits(subject, "b"), { prev: subject.units[0], next: subject.units[2] });
	assert.deepEqual(siblingUnits(subject, "c"), { prev: subject.units[1], next: undefined });
	assert.deepEqual(siblingUnits(subject, "zzz"), {});
});

test("counts", () => {
	assert.equal(countSubjects(data.courses[0]), 1);
	assert.equal(countUnits(data.courses[0]), 1);
});

test("findUnit", () => {
	const sub = data.courses[0].branches[0].semesters[0].subjects[0];
	assert.equal(findUnit(sub, "u1")?.title, "U1");
	assert.equal(findUnit(sub, "zzz"), undefined);
	assert.equal(findUnit(sub, undefined), undefined);
});

test("contentRoutes lists only pages with real content", () => {
	assert.deepEqual(contentRoutes(data), [
		"/dashboard/btech/cse/sem1/web",
		"/dashboard/btech/cse/sem1/web/u1",
	]);
	const empty: CoursesData = {
		courses: [{ ...data.courses[0], branches: [{ ...data.courses[0].branches[0], semesters: [] }] }],
	};
	assert.deepEqual(contentRoutes(empty), []);
});

test("resolveWithin blocks traversal and absolute paths", () => {
	const root = path.resolve("/srv/app/src/content");
	assert.equal(resolveWithin(root, "btech/cse/u1.mdx"), path.join(root, "btech", "cse", "u1.mdx"));
	assert.equal(resolveWithin(root, "/btech/u1.mdx"), path.join(root, "btech", "u1.mdx"));
	assert.equal(resolveWithin(root, "../../.env"), null);
	assert.equal(resolveWithin(root, "a/../../b"), null);
	assert.equal(resolveWithin(root, ""), null);
	assert.equal(resolveWithin(root, "a\0b"), null);
});

test("breadcrumbsFor uses real titles and links each level", () => {
	const slugs = ["btech", "cse", "sem1", "web", "u1"];
	const node = resolvePath(data, slugs)!;
	assert.deepEqual(breadcrumbsFor(node, slugs), [
		{ name: "Dashboard", path: "/dashboard" },
		{ name: "B.Tech", path: "/dashboard/btech" },
		{ name: "CSE", path: "/dashboard/btech/cse" },
		{ name: "Semester 1", path: "/dashboard/btech/cse/sem1" },
		{ name: "Web", path: "/dashboard/btech/cse/sem1/web" },
		{ name: "U1", path: "/dashboard/btech/cse/sem1/web/u1" },
	]);
	const semSlugs = ["btech", "cse", "sem2"];
	assert.equal(breadcrumbsFor(resolvePath(data, semSlugs)!, semSlugs).length, 4);
});
