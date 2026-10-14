/**
 * Details that the legal pages need from the site owner.
 *
 * Nothing here is invented: every field the owner has not supplied is `null`.
 * While any REQUIRED field is `null` the legal pages show a "draft" banner,
 * render visible [REQUIRED] markers, are marked noindex and stay out of the
 * sitemap. Fill the values in, then review the page text with a qualified
 * legal adviser before relying on it.
 */
export interface LegalDetails {
	/** Person or organisation that operates the site, as it should appear publicly. REQUIRED. */
	operatorName: string | null;
	/** Place whose law governs the Terms and whose courts have jurisdiction (e.g. a state and country). REQUIRED. */
	jurisdiction: string | null;
	/** Date these documents take effect, YYYY-MM-DD. REQUIRED. */
	effectiveDate: string | null;
	/** Public contact address (already published on the site). */
	contactEmail: string;
	/**
	 * Name / email of a grievance or copyright contact, if different from contactEmail.
	 * Some jurisdictions require one for websites that host user content or run ads:
	 * confirm with an adviser. Optional.
	 */
	grievanceContact: string | null;
	/** Postal address, if you want to publish one. Optional. */
	postalAddress: string | null;
}

export const LEGAL: LegalDetails = {
	operatorName: null,
	jurisdiction: null,
	effectiveDate: null,
	contactEmail: "procoderji@gmail.com",
	grievanceContact: null,
	postalAddress: null,
};

export const REQUIRED_LEGAL_FIELDS = ["operatorName", "jurisdiction", "effectiveDate"] as const;
export type RequiredLegalField = (typeof REQUIRED_LEGAL_FIELDS)[number];

export const LEGAL_FIELD_LABELS: Record<RequiredLegalField, string> = {
	operatorName: "Operator name (person or organisation)",
	jurisdiction: "Governing law / jurisdiction",
	effectiveDate: "Effective date (YYYY-MM-DD)",
};

const blank = (v: string | null | undefined) => v === null || v === undefined || v.trim() === "";

const validIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Required fields that are still missing or invalid. */
export function missingLegalFields(details: LegalDetails = LEGAL): RequiredLegalField[] {
	return REQUIRED_LEGAL_FIELDS.filter((f) => {
		const v = details[f];
		if (blank(v)) return true;
		return f === "effectiveDate" && !validIsoDate(v as string);
	});
}

export const isLegalComplete = (details: LegalDetails = LEGAL) => missingLegalFields(details).length === 0;

/** Site paths of the legal pages (used by the footer and the sitemap). */
export const LEGAL_PAGES = [
	{ path: "/about", label: "About" },
	{ path: "/privacy", label: "Privacy Policy" },
	{ path: "/terms", label: "Terms of Use" },
	{ path: "/disclaimer", label: "Disclaimer" },
	{ path: "/copyright", label: "Copyright & Takedown" },
] as const;

/** Sitemap entries for the legal pages; empty until the owner's details are complete. */
export function legalSitemapRoutes(details: LegalDetails = LEGAL): { path: string; lastModified?: string }[] {
	if (!isLegalComplete(details)) return [];
	return LEGAL_PAGES.map((p) => ({ path: p.path, lastModified: details.effectiveDate as string }));
}
