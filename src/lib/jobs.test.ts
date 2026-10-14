import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
	ARCHIVE_AFTER_DEADLINE_DAYS,
	ARCHIVE_AFTER_VERIFIED_DAYS,
	SUMMARY_MAX_CHARS,
	daysBetween,
	isArchived,
	jobStatus,
	partitionJobs,
	todayIso,
	validateJobs,
	type Job,
	type JobsData,
} from "./jobs.ts";

// Synthetic fixtures only. These are NOT real listings.
const job = (over: Partial<Job> = {}): Job => ({
	id: "example-co-graduate-engineer",
	company: "Example Co",
	title: "Graduate Engineer (test fixture)",
	category: "fresher",
	employmentType: "full-time",
	location: { city: "Exampleville", country: "India", remote: false },
	eligibility: { degrees: ["B.Tech"], batches: [2026] },
	summary: "A short summary written in our own words.",
	applyUrl: "https://careers.example.com/jobs/1",
	postedAt: "2026-10-01",
	deadline: "2026-11-30",
	lastVerifiedAt: "2026-10-10",
	...over,
});

const TODAY = "2026-10-14";

test("daysBetween counts whole days in both directions", () => {
	assert.equal(daysBetween("2026-10-01", "2026-10-14"), 13);
	assert.equal(daysBetween("2026-10-14", "2026-10-01"), -13);
	assert.equal(daysBetween("2026-02-28", "2026-03-01"), 1);
	assert.equal(daysBetween("2026-10-14", "2026-10-14"), 0);
});

test("todayIso formats the UTC date", () => {
	assert.equal(todayIso(new Date("2026-10-14T23:59:59Z")), "2026-10-14");
});

test("an open listing with a distant deadline is open", () => {
	assert.equal(jobStatus(job(), TODAY), "open");
	assert.equal(jobStatus(job({ deadline: undefined }), TODAY), "open");
});

test("the deadline day itself is still open; the day after is closed", () => {
	assert.notEqual(jobStatus(job({ deadline: "2026-10-14" }), "2026-10-14"), "closed");
	assert.equal(jobStatus(job({ deadline: "2026-10-14" }), "2026-10-15"), "closed");
});

test("closing soon applies inside the 7-day window only", () => {
	assert.equal(jobStatus(job({ deadline: "2026-10-21" }), TODAY), "closing-soon"); // 7 days
	assert.equal(jobStatus(job({ deadline: "2026-10-22" }), TODAY), "open"); // 8 days
	assert.equal(jobStatus(job({ deadline: "2026-10-14" }), TODAY), "closing-soon"); // today
});

test("a listing not verified for over 30 days is flagged unverified, but closed still wins", () => {
	assert.equal(jobStatus(job({ lastVerifiedAt: "2026-09-14" }), TODAY), "open"); // exactly 30 days
	assert.equal(jobStatus(job({ lastVerifiedAt: "2026-09-13" }), TODAY), "unverified"); // 31 days
	assert.equal(jobStatus(job({ lastVerifiedAt: "2026-08-01", deadline: "2026-10-01" }), TODAY), "closed");
});

test("archive rules: 60 days after the deadline, or 90 days since verification without one", () => {
	assert.equal(ARCHIVE_AFTER_DEADLINE_DAYS, 60);
	assert.equal(isArchived(job({ deadline: "2026-08-15" }), TODAY), false); // 60 days ago
	assert.equal(isArchived(job({ deadline: "2026-08-14" }), TODAY), true); // 61 days ago
	assert.equal(ARCHIVE_AFTER_VERIFIED_DAYS, 90);
	assert.equal(isArchived(job({ deadline: undefined, lastVerifiedAt: "2026-07-16" }), TODAY), false); // 90 days
	assert.equal(isArchived(job({ deadline: undefined, lastVerifiedAt: "2026-07-15" }), TODAY), true); // 91 days
});

test("partitionJobs separates active, closed and archived and orders active by deadline", () => {
	const late = job({ id: "late", deadline: "2026-12-01" });
	const soon = job({ id: "soon", deadline: "2026-10-20" });
	const none = job({ id: "none", deadline: undefined });
	const closed = job({ id: "closed", deadline: "2026-10-01" });
	const old = job({ id: "old", deadline: "2026-06-01" });
	const { active, closed: closedList, archived } = partitionJobs([late, none, closed, soon, old], TODAY);
	assert.deepEqual(active.map((j) => j.id), ["soon", "late", "none"]);
	assert.deepEqual(closedList.map((j) => j.id), ["closed"]);
	assert.deepEqual(archived.map((j) => j.id), ["old"]);
});

test("validateJobs accepts a well-formed listing", () => {
	assert.deepEqual(validateJobs([job()], TODAY), []);
});

test("validateJobs rejects non-official, unsafe or malformed apply links", () => {
	const p = (applyUrl: string) => validateJobs([job({ applyUrl })], TODAY).join("\n");
	assert.match(p("http://careers.example.com/1"), /must be https/);
	assert.match(p("https://bit.ly/abc"), /link shortener/);
	assert.match(p("https://t.co/abc"), /link shortener/);
	assert.match(p("https://user:pw@careers.example.com/1"), /credentials/);
	assert.match(p("not a url"), /not a valid URL/);
	assert.match(p("javascript:alert(1)"), /must be https/);
});

test("validateJobs rejects copied-looking summaries, bad dates and missing fields", () => {
	const p = (over: Partial<Job>) => validateJobs([job(over)], TODAY).join("\n");
	assert.match(p({ summary: "x".repeat(SUMMARY_MAX_CHARS + 1) }), /over 400 characters/);
	assert.match(p({ summary: "  " }), /empty summary/);
	assert.match(p({ postedAt: "2026-13-01" }), /postedAt must be a real/);
	assert.match(p({ lastVerifiedAt: "2026-12-31" }), /lastVerifiedAt is in the future/);
	assert.match(p({ deadline: "2026-09-01" }), /deadline is before postedAt/);
	assert.match(p({ lastVerifiedAt: "2026-09-01" }), /lastVerifiedAt is before postedAt/);
	assert.match(p({ company: "" }), /empty company/);
	assert.match(p({ location: { country: "", remote: false } }), /location.country/);
	assert.match(p({ eligibility: { degrees: [] } }), /eligibility.degrees/);
	assert.match(p({ id: "Bad Id" }), /invalid id/);
});

test("validateJobs rejects duplicate ids", () => {
	assert.match(validateJobs([job(), job()], TODAY).join("\n"), /duplicate id/);
});

test("the real jobs.json is valid", () => {
	const data = JSON.parse(fs.readFileSync("src/data/jobs.json", "utf8")) as JobsData;
	assert.deepEqual(validateJobs(data.jobs, todayIso()), []);
});

test("the jobs page is in the sitemap only while something is open", async () => {
	const { jobsSitemapRoutes } = await import("./jobs.ts");
	assert.deepEqual(jobsSitemapRoutes([], TODAY), []);
	assert.deepEqual(jobsSitemapRoutes([job({ deadline: "2026-10-01" })], TODAY), []); // only closed
	assert.deepEqual(jobsSitemapRoutes([job()], TODAY), [{ path: "/jobs" }]);
});
