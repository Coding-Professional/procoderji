// Pure helpers over the course catalogue (src/data/courses.json).
// They take the data as an argument so they can be unit-tested; see courses.ts
// for the bound versions used by the app.
import type { Branch, Course, CoursesData, Semester, Subject, Unit } from "../types/global";
import type { SitemapRoute } from "./site";

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
 * Structure pages that only list empty semesters are intentionally left out.
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

/**
 * Sitemap routes for subject pages with real content. lastModified comes only
 * from the units' own dates (latest updatedAt/addedAt); it is omitted when no
 * unit records a date, so the sitemap never claims a made-up modification time.
 */
export function sitemapRoutes(data: CoursesData): SitemapRoute[] {
	const out: SitemapRoute[] = [];
	for (const c of data.courses)
		for (const b of c.branches)
			for (const s of b.semesters)
				for (const su of s.subjects) {
					const dates = su.units.flatMap((u) => [u.updatedAt, u.addedAt]).filter((d): d is string => !!d);
					const lastModified = dates.sort().at(-1);
					out.push({
						path: dashboardHref([c.slug, b.slug, s.slug, su.slug]),
						...(lastModified ? { lastModified } : {}),
					});
				}
	return out;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validDate = (d: string) => ISO_DATE_RE.test(d) && !Number.isNaN(Date.parse(d));

/**
 * Structural checks for courses.json. Returns a list of human-readable problems
 * (empty when valid). `fileExists` lets callers verify that unit files exist on disk.
 */
export function validateCatalog(data: CoursesData, fileExists?: (unitPath: string) => boolean): string[] {
	const problems: string[] = [];
	const unique = (label: string, slugs: string[]) => {
		const seen = new Set<string>();
		for (const s of slugs) {
			if (!SLUG_RE.test(s)) problems.push(`${label}: invalid slug "${s}"`);
			if (seen.has(s)) problems.push(`${label}: duplicate slug "${s}"`);
			seen.add(s);
		}
	};

	unique("courses", data.courses.map((c) => c.slug));
	for (const c of data.courses) {
		unique(`${c.slug}/branches`, c.branches.map((b) => b.slug));
		for (const b of c.branches) {
			unique(`${c.slug}/${b.slug}/semesters`, b.semesters.map((s) => s.slug));
			for (const s of b.semesters) {
				const where = `${c.slug}/${b.slug}/${s.slug}`;
				unique(`${where}/subjects`, s.subjects.map((x) => x.slug));
				for (const su of s.subjects) {
					if (!su.title.trim()) problems.push(`${where}/${su.slug}: empty title`);
					unique(`${where}/${su.slug}/units`, su.units.map((u) => u.slug));
					for (const u of su.units) {
						const id = `${where}/${su.slug}/${u.slug}`;
						if (!u.title.trim()) problems.push(`${id}: empty title`);
						if (fileExists && !fileExists(u.path)) problems.push(`${id}: note file not found (${u.path})`);
						for (const k of ["addedAt", "updatedAt"] as const) {
							const v = u[k];
							if (v !== undefined && !validDate(v)) problems.push(`${id}: ${k} must be a real YYYY-MM-DD date`);
						}
						if (u.addedAt && u.updatedAt && u.updatedAt < u.addedAt) problems.push(`${id}: updatedAt is before addedAt`);
					}
				}
			}
		}
	}
	return problems;
}
