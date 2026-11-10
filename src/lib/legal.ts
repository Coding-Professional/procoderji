import { CONTACT_EMAIL } from "./contact.ts";
import { isRealIsoDate } from "./dates.ts";

/**
 * Details that the legal pages need from the site owner.
 *
 * Only values the owner has confirmed or that the project already establishes
 * are filled in; everything else is `null`. While any REQUIRED field is `null`
 * the legal pages show a "draft" banner and visible [REQUIRED] markers, are
 * marked noindex and stay out of the sitemap. The text must be reviewed by a
 * qualified legal adviser before it is relied on.
 */
export interface LegalDetails {
	/** Person or organisation that operates the site, as it appears publicly. REQUIRED. */
	operatorName: string | null;
	/** Whether the operator is an individual or a registered organisation. */
	operatorType: "individual" | "organisation";
	/** Law that governs the Terms of Use. REQUIRED. */
	governingLaw: string | null;
	/** City/state whose courts have jurisdiction over disputes. REQUIRED. Never guessed. */
	courtsLocation: string | null;
	/** Date these documents take effect, YYYY-MM-DD (the actual publication date). REQUIRED. */
	effectiveDate: string | null;
	/** Public contact address; the same one the site already publishes. */
	contactEmail: string;
	/**
	 * Name / email of a grievance or copyright contact, if different from contactEmail.
	 * India's IT Rules, 2021 require one only from "intermediaries"; whether this site is
	 * one is a question for a legal adviser. Optional.
	 */
	grievanceContact: string | null;
	/** Postal address, if you want to publish one. Optional; not published by default. */
	postalAddress: string | null;
}

export const LEGAL: LegalDetails = {
	// Confirmed by the owner; matches the LICENSE copyright holder (checked in tests).
	operatorName: "Satyam Yadav",
	operatorType: "individual",
	// Confirmed by the owner: Indian law.
	governingLaw: "India",
	// Confirmed by the owner: the city and state whose courts should have jurisdiction.
	courtsLocation: "India",
	// Confirmed by the owner: the planned publication date.
	effectiveDate: "2023-01-01",
	// Single source of truth shared with the contact form.
	contactEmail: CONTACT_EMAIL,
	grievanceContact: "procoderji@gmail.com",
	postalAddress: "India",
};

export const REQUIRED_LEGAL_FIELDS = ["operatorName", "governingLaw", "courtsLocation", "effectiveDate"] as const;
export type RequiredLegalField = (typeof REQUIRED_LEGAL_FIELDS)[number];

export const LEGAL_FIELD_LABELS: Record<RequiredLegalField, string> = {
	operatorName: "Operator name (person or organisation)",
	governingLaw: "Governing law",
	courtsLocation: "City and state whose courts have jurisdiction",
	effectiveDate: "Effective date (YYYY-MM-DD)",
};

const blank = (v: string | null | undefined) => v === null || v === undefined || v.trim() === "";

/** Required fields that are still missing or invalid. */
export function missingLegalFields(details: LegalDetails = LEGAL): RequiredLegalField[] {
	return REQUIRED_LEGAL_FIELDS.filter((f) => {
		const v = details[f];
		if (blank(v)) return true;
		return f === "effectiveDate" && !isRealIsoDate(v as string);
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
