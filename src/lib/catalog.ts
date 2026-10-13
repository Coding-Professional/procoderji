// Pure helpers over the course catalogue (src/data/courses.json).
// They take the data as an argument so they can be unit-tested; see courses.ts
// for the bound versions used by the app.
import type { Branch, Course, CoursesData, Semester, Subject, Unit } from "../types/global";

export type CatalogNode =
	| { type: "root"; courses: Course[] }
	| { type: "course"; course: Course }
	| { type: "branch"; course: Course; branch: Branch }
	| { type: "semester"; course: Course; branch: Branch; semester: Semester }
	| { type: "subject"; course: Course; branch: Branch; semester: Semester; subject: Subject };

/** Resolve a slug path like ["btech","cse","sem1","dsa"]. Returns null if any part is unknown or too deep. */
export function resolvePath(data: CoursesData, slugs: string[]): CatalogNode | null {
	if (slugs.length === 0) return { type: "root", courses: data.courses };
	if (slugs.length > 4) return null;

	const [courseSlug, branchSlug, semesterSlug, subjectSlug] = slugs;
	const course = data.courses.find((c) => c.slug === courseSlug);
	if (!course) return null;
	if (!branchSlug) return { type: "course", course };

	const branch = course.branches.find((b) => b.slug === branchSlug);
	if (!branch) return null;
	if (!semesterSlug) return { type: "branch", course, branch };

	const semester = branch.semesters.find((s) => s.slug === semesterSlug);
	if (!semester) return null;
	if (!subjectSlug) return { type: "semester", course, branch, semester };

	const subject = semester.subjects.find((s) => s.slug === subjectSlug);
	if (!subject) return null;
	return { type: "subject", course, branch, semester, subject };
}

export function findUnit(subject: Subject, unitSlug: string | undefined): Unit | undefined {
	if (!unitSlug) return undefined;
	return subject.units.find((u) => u.slug === unitSlug);
}

export function countSubjects(node: Branch | Semester | Course): number {
	if ("subjects" in node) return node.subjects.length;
	if ("semesters" in node) return node.semesters.reduce((n, s) => n + s.subjects.length, 0);
	return node.branches.reduce((n, b) => n + countSubjects(b), 0);
}

export function countUnits(node: Subject | Semester | Branch | Course): number {
	if ("units" in node) return node.units.length;
	if ("subjects" in node) return node.subjects.reduce((n, s) => n + s.units.length, 0);
	if ("semesters" in node) return node.semesters.reduce((n, s) => n + countUnits(s), 0);
	return node.branches.reduce((n, b) => n + countUnits(b), 0);
}

/** Dashboard URL for a slug path. */
export function dashboardHref(slugs: string[]): string {
	return ["/dashboard", ...slugs].join("/");
}

/**
 * Dashboard URLs for every page that has real content (a subject, or a unit of a subject).
 * Structure pages that only list empty semesters are intentionally left out, so
 * sitemaps never advertise "coming soon" pages.
 */
export function contentRoutes(data: CoursesData): string[] {
	const out: string[] = [];
	for (const c of data.courses)
		for (const b of c.branches)
			for (const s of b.semesters)
				for (const su of s.subjects) {
					const base = dashboardHref([c.slug, b.slug, s.slug, su.slug]);
					out.push(base);
					for (const u of su.units) out.push(`${base}?note=${u.slug}`);
				}
	return out;
}
