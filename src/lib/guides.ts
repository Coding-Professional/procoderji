import { isRealIsoDate } from "./dates.ts";

// Original learning guides (interview prep, DSA, system design, resumes, GitHub, tools).
// Guides are registered in src/data/guides.json and written as Markdown under
// src/content/guides/. Registering a guide publishes it.

export const GUIDE_CATEGORIES = [
	{ slug: "interview-prep", label: "Interview preparation" },
	{ slug: "dsa", label: "DSA roadmaps" },
	{ slug: "system-design", label: "System design" },
	{ slug: "resume", label: "Resumes" },
	{ slug: "github", label: "GitHub" },
	{ slug: "tools", label: "Developer tools" },
] as const;

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number]["slug"];
export const GUIDE_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type GuideLevel = (typeof GUIDE_LEVELS)[number];

export interface Guide {
	slug: string;
	title: string;
	/** One or two original sentences; used on the card and as the meta description. */
	description: string;
	category: GuideCategory;
	level: GuideLevel;
	/** Note file path relative to src/ (inside src/content). */
	path: string;
	addedAt: string; // YYYY-MM-DD
	updatedAt?: string; // YYYY-MM-DD
}

export interface GuidesData {
	guides: Guide[];
}

export const categoryLabel = (slug: GuideCategory) => GUIDE_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

/** Newest first (by last update, then publication date). */
export function sortGuides(guides: Guide[]): Guide[] {
	const key = (g: Guide) => g.updatedAt ?? g.addedAt;
	return [...guides].sort((a, b) => key(b).localeCompare(key(a)) || a.title.localeCompare(b.title));
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = isRealIsoDate;

/** Structural checks for guides.json; returns human-readable problems (empty when valid). */
export function validateGuides(guides: Guide[], fileExists?: (path: string) => boolean): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	for (const g of guides) {
		const id = g.slug || "(no slug)";
		if (!SLUG_RE.test(g.slug)) problems.push(`${id}: invalid slug`);
		if (seen.has(g.slug)) problems.push(`${id}: duplicate slug`);
		seen.add(g.slug);
		if (!g.title?.trim()) problems.push(`${id}: empty title`);
		if (!g.description?.trim()) problems.push(`${id}: empty description`);
		if (!GUIDE_CATEGORIES.some((c) => c.slug === g.category)) problems.push(`${id}: unknown category "${g.category}"`);
		if (!GUIDE_LEVELS.includes(g.level)) problems.push(`${id}: unknown level "${g.level}"`);
		if (!g.addedAt || !validDate(g.addedAt)) problems.push(`${id}: addedAt must be a real YYYY-MM-DD date`);
		if (g.updatedAt !== undefined) {
			if (!validDate(g.updatedAt)) problems.push(`${id}: updatedAt must be a real YYYY-MM-DD date`);
			else if (g.addedAt && g.updatedAt < g.addedAt) problems.push(`${id}: updatedAt is before addedAt`);
		}
		if (fileExists && !fileExists(g.path)) problems.push(`${id}: guide file not found (${g.path})`);
	}
	return problems;
}

/**
 * Sitemap routes: the index plus each guide, only for guides whose file can be read,
 * and nothing at all when there are none. lastModified is the guide's own date.
 */
export function guideSitemapRoutes(
	guides: Guide[],
	hasNote: (guide: Guide) => boolean = () => true
): { path: string; lastModified?: string }[] {
	const readable = guides.filter(hasNote);
	if (readable.length === 0) return [];
	return [
		{ path: "/guides" },
		...readable.map((g) => ({ path: `/guides/${g.slug}`, lastModified: g.updatedAt ?? g.addedAt })),
	];
}
