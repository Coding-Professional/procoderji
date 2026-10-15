// Structured data (schema.org JSON-LD) builders. They only emit fields that are
// actually known; nothing is defaulted to "now" or invented.

export interface Crumb {
	name: string;
	path: string;
}

export function breadcrumbJsonLd(siteUrl: string, crumbs: Crumb[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: crumbs.map((c, i) => ({
			"@type": "ListItem",
			position: i + 1,
			name: c.name,
			item: `${siteUrl}${c.path}`,
		})),
	};
}

export interface ArticleInput {
	headline: string;
	description?: string;
	path: string;
	authorName: string;
	datePublished?: string;
	dateModified?: string;
}

export function articleJsonLd(siteUrl: string, a: ArticleInput) {
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: a.headline,
		...(a.description ? { description: a.description } : {}),
		mainEntityOfPage: `${siteUrl}${a.path}`,
		author: { "@type": "Person", name: a.authorName },
		...(a.datePublished ? { datePublished: a.datePublished } : {}),
		...(a.dateModified ? { dateModified: a.dateModified } : {}),
	};
}

/** Serialise for a <script type="application/ld+json"> tag; "<" is escaped so content cannot close the tag. */
export function jsonLdString(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}
