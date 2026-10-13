import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolvePath, countSubjects, countUnits, contentRoutes, findUnit } from "./catalog.ts";
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
});

test("resolvePath rejects unknown slugs and over-deep paths", () => {
	assert.equal(resolvePath(data, ["mtech"]), null);
	assert.equal(resolvePath(data, ["btech", "it"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem9"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem2", "nope"]), null);
	assert.equal(resolvePath(data, ["btech", "year3", "sem5", "ml"]), null);
	assert.equal(resolvePath(data, ["btech", "cse", "sem1", "web", "extra"]), null);
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
		"/dashboard/btech/cse/sem1/web?note=u1",
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
