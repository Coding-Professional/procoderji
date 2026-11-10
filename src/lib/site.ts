import { PRACTICE_TOPICS } from "../features/practice/domain/topics.ts";

/**
 * Canonical site origin.
 *
 * The primary domain is https://procoderji.com. It can be overridden with the
 * NEXT_PUBLIC_SITE_URL environment variable (e.g. for a staging build); an
 * unset or malformed value falls back to the default, so canonical, Open Graph,
 * sitemap and robots URLs can never be empty or broken.
 */
export const DEFAULT_SITE_URL = "https://procoderji.com";

/** Normalise a configured value to a bare https?:// origin, or null if unusable. */
export function parseSiteUrl(value: string | undefined | null): string | null {
	if (!value) return null;
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	if (url.username || url.password) return null;
	return url.origin; // drops path, query, hash and trailing slash
}

export function resolveSiteUrl(configured: string | undefined | null): string {
	return parseSiteUrl(configured) ?? DEFAULT_SITE_URL;
}

export function getSiteUrl(): string {
	return resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export interface SitemapEntry {
	url: string;
	lastModified?: string;
}

/** A page for the sitemap; `lastModified` must be a real content date, never "now". */
export interface SitemapRoute {
	path: string;
	lastModified?: string;
}

/** Static pages worth indexing. Placeholder pages are excluded. */
export const STATIC_ROUTES: SitemapRoute[] = [
  { path: "/" },
  { path: "/dashboard" },
  { path: "/games" },
  { path: "/games/pattern-sprint" },
  { path: "/games/digit-recall" },
  { path: "/practice" },
  ...PRACTICE_TOPICS.map(({ id }) => ({ path: `/practice/${id}` })),
];

/**
 * Build sitemap entries. Query-string routes (?note=) are dropped because they
 * render the same page as their subject URL; duplicate paths keep the first entry.
 */
export function buildSitemapEntries(siteUrl: string, routes: SitemapRoute[]): SitemapEntry[] {
	const seen = new Set<string>();
	const out: SitemapEntry[] = [];
	for (const r of [...STATIC_ROUTES, ...routes]) {
		if (r.path.includes("?") || seen.has(r.path)) continue;
		seen.add(r.path);
		out.push({
			url: r.path === "/" ? siteUrl : `${siteUrl}${r.path}`,
			...(r.lastModified ? { lastModified: r.lastModified } : {}),
		});
	}
	return out;
}
