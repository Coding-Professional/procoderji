/**
 * Canonical site origin, taken from NEXT_PUBLIC_SITE_URL.
 *
 * It is deliberately NOT hard-coded: the canonical domain must be confirmed
 * by the site owner. While it is unset, sitemap.xml is empty and robots.txt
 * has no Sitemap line, so no wrong absolute URL is ever published.
 */

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

export function getSiteUrl(): string | null {
	return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
}

export interface SitemapEntry {
	url: string;
}

/** Static pages worth indexing. Placeholder pages (/about, /courses) are excluded. */
export const STATIC_ROUTES = ["/", "/dashboard"];

/**
 * Build sitemap entries. Query-string routes (?note=) are dropped because they
 * render the same page as their subject URL.
 */
export function buildSitemapEntries(siteUrl: string | null, contentRoutes: string[]): SitemapEntry[] {
	if (!siteUrl) return [];
	const paths = new Set<string>([...STATIC_ROUTES, ...contentRoutes.filter((r) => !r.includes("?"))]);
	return [...paths].map((p) => ({ url: p === "/" ? siteUrl : `${siteUrl}${p}` }));
}
