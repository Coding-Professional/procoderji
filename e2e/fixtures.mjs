// Temporary SYNTHETIC content for browser tests. Never committed to the real data files:
// run.mjs applies these, runs the checks, and always restores the originals.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILES = ["src/data/courses.json", "src/data/guides.json", "src/data/jobs.json"];
const FIXTURE_DIRS = ["src/content/__qa__"];
const FIXTURE_FILES = ["src/content/guides/qa-guide.mdx"];

const iso = (offsetDays) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

const NOTE = `# A long section

Fixture paragraph with a [good link](https://example.org/page) and a [bad link](javascript:alert(1)).

VeryLongUnbrokenTokenToTestOverflowVeryLongUnbrokenTokenToTestOverflowVeryLongUnbrokenTokenToTestOverflow

\`\`\`js
const aVeryLongLineOfCode = "this line is deliberately long so that the code block must scroll horizontally on small screens";
\`\`\`

- item one
- item two
`;

/** Refuse to run if real content has uncommitted changes (so nothing of yours can be overwritten). */
export function assertClean() {
	const out = execFileSync("git", ["status", "--porcelain", "--", "src/data", "src/content"], { cwd: ROOT }).toString().trim();
	if (out) throw new Error("Refusing to run: src/data or src/content has uncommitted changes:\n" + out);
}

export function apply() {
	assertClean();
	fs.mkdirSync(path.join(ROOT, "src/content/__qa__"), { recursive: true });
	fs.mkdirSync(path.join(ROOT, "src/content/guides"), { recursive: true });
	fs.writeFileSync(path.join(ROOT, "src/content/__qa__/unit.mdx"), NOTE);
	fs.writeFileSync(path.join(ROOT, "src/content/guides/qa-guide.mdx"), NOTE);

	const coursesPath = path.join(ROOT, "src/data/courses.json");
	const courses = JSON.parse(fs.readFileSync(coursesPath, "utf8"));
	courses.courses[0].branches[0].semesters[0].subjects.push({
		slug: "qa-subject",
		title: "QA Subject",
		desc: "Synthetic QA fixture subject.",
		units: [
			{ slug: "unit-a", title: "QA Unit A", path: "content/__qa__/unit.mdx", addedAt: "2026-10-01", updatedAt: "2026-10-05" },
			{ slug: "unit-b", title: "QA Unit B", path: "content/__qa__/unit.mdx", addedAt: "2026-10-02" },
		],
	});
	fs.writeFileSync(coursesPath, JSON.stringify(courses, null, 2) + "\n");

	const job = (id, over) => ({
		id, company: "Example Co (QA fixture)", title: "Role " + id, category: "fresher", employmentType: "full-time",
		location: { city: "Exampleville", country: "India", remote: false }, eligibility: { degrees: ["B.Tech"], batches: [2026] },
		summary: "Synthetic fixture summary for " + id + ".", applyUrl: "https://careers.example.com/" + id,
		postedAt: iso(-40), lastVerifiedAt: iso(-2), ...over,
	});
	fs.writeFileSync(
		path.join(ROOT, "src/data/jobs.json"),
		JSON.stringify({ jobs: [
			job("open-job", { deadline: iso(30) }),
			job("closing-job", { deadline: iso(3) }),
			job("closed-job", { deadline: iso(-5) }),
			job("archived-job", { deadline: iso(-100), postedAt: iso(-150), lastVerifiedAt: iso(-120) }),
		] }, null, 2) + "\n"
	);
	fs.writeFileSync(
		path.join(ROOT, "src/data/guides.json"),
		JSON.stringify({ guides: [{ slug: "qa-guide", title: "QA Guide", description: "Synthetic QA guide.", category: "dsa", level: "beginner", path: "content/guides/qa-guide.mdx", addedAt: "2026-10-01" }] }, null, 2) + "\n"
	);
}

export function restore() {
	execFileSync("git", ["checkout", "--", ...DATA_FILES], { cwd: ROOT });
	for (const d of FIXTURE_DIRS) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
	for (const f of FIXTURE_FILES) fs.rmSync(path.join(ROOT, f), { force: true });
	// Remove src/content/guides only if the fixture was the sole thing in it.
	const guidesDir = path.join(ROOT, "src/content/guides");
	if (fs.existsSync(guidesDir) && fs.readdirSync(guidesDir).length === 0) fs.rmdirSync(guidesDir);
}
