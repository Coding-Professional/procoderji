// Pure helpers over the course catalogue (src/data/courses.json).
// They take the data as an argument so they can be unit-tested; see courses.ts
// for the bound versions used by the app.
import type { Branch, Course, CoursesData, Semester, Subject, Unit } from "../types/global";
import type { SitemapRoute } from "./site";
import { isRealIsoDate } from "./dates.ts";

export type CatalogNode =
	| { type: "root"; courses: Course[] }
	| { type: "course"; course: Course }
	| { type: "branch"; course: Course; branch: Branch }
	| { type: "semester"; course: Course; branch: Branch; semester: Semester }
	| { type: "subject"; course: Course; branch: Branch; semester: Semester; subject: Subject }
	| { type: "unit"; course: Course; branch: Branch; semester: Semester; subject: Subject; unit: Unit };

/** Resolve a slug path like ["btech","cse","sem1","dsa","unit-1"]. Returns null if any part is unknown or too deep. */
export function resolvePath(data: CoursesData, slugs: string[]): CatalogNode | null {
	if (slugs.length === 0) return { type: "root", courses: data.courses };
	if (slugs.length > 5) return null;

	const [courseSlug, branchSlug, semesterSlug, subjectSlug, unitSlug] = slugs;
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
	if (!unitSlug) return { type: "subject", course, branch, semester, subject };

	const unit = subject.units.find((u) => u.slug === unitSlug);
	if (!unit) return null;
	return { type: "unit", course, branch, semester, subject, unit };
}

/** The units before and after `unitSlug` within a subject, for previous/next links. */
export function siblingUnits(subject: Subject, unitSlug: string): { prev?: Unit; next?: Unit } {
	const i = subject.units.findIndex((u) => u.slug === unitSlug);
	if (i < 0) return {};
	return { prev: subject.units[i - 1], next: subject.units[i + 1] };
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
					for (const u of su.units) out.push(`${base}/${u.slug}`);
				}
	return out;
}

/**
 * Sitemap routes for subject pages and unit pages with real content. lastModified
 * comes only from the units' own dates (latest updatedAt/addedAt); it is omitted
 * when no date is recorded, so the sitemap never claims a made-up modification time.
 */
export function sitemapRoutes(data: CoursesData, hasNote: (unit: Unit) => boolean = () => true): SitemapRoute[] {
	const out: SitemapRoute[] = [];
	for (const c of data.courses)
		for (const b of c.branches)
			for (const s of b.semesters)
				for (const su of s.subjects) {
					const units = su.units.filter(hasNote);
					if (units.length === 0) continue;
					const latest = (units: Unit[]) =>
						units
							.flatMap((u) => [u.updatedAt, u.addedAt])
							.filter((d): d is string => !!d)
							.sort()
							.at(-1);
					const base = dashboardHref([c.slug, b.slug, s.slug, su.slug]);
					const subjectDate = latest(units);
					out.push({ path: base, ...(subjectDate ? { lastModified: subjectDate } : {}) });
					for (const u of units) {
						const unitDate = latest([u]);
						out.push({ path: `${base}/${u.slug}`, ...(unitDate ? { lastModified: unitDate } : {}) });
					}
				}
	return out;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = isRealIsoDate;

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

export interface BreadcrumbItem {
	name: string;
	path: string;
}

/** Breadcrumb trail (with real titles) from the dashboard down to `node`. */
export function breadcrumbsFor(node: CatalogNode, slugs: string[]): BreadcrumbItem[] {
	const crumbs: BreadcrumbItem[] = [{ name: "Dashboard", path: "/dashboard" }];
	if (node.type === "root") return crumbs;

	const add = (name: string, depth: number) => crumbs.push({ name, path: dashboardHref(slugs.slice(0, depth)) });
	add(node.course.title, 1);
	if (node.type === "course") return crumbs;
	add(node.branch.short ?? node.branch.title, 2);
	if (node.type === "branch") return crumbs;
	add(node.semester.title, 3);
	if (node.type === "semester") return crumbs;
	add(node.subject.title, 4);
	if (node.type === "subject") return crumbs;
	add(node.unit.title, 5);
	return crumbs;
}
