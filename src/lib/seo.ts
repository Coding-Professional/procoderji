import type { Metadata } from "next";

export const SITE_NAME = "ProCoderJii Notes";
export const SITE_DESCRIPTION =
  "Free notes and study material for engineering students from the ProCoderJii community.";

interface PageMetaInput {
  title: string;
  description: string;
  /** Site-relative path used for the canonical URL, e.g. "/dashboard/btech/cse". */
  path: string;
  /** Keep the page out of search results (e.g. "coming soon" pages). */
  noindex?: boolean;
}

/**
 * Per-page metadata. Relative canonical / Open Graph URLs are resolved against
 * metadataBase (the site origin, set in the root layout).
 */
export function pageMetadata({ title, description, path, noindex }: PageMetaInput): Metadata {
  return {
    title,
    description,
    ...(noindex
      ? { robots: { index: false, follow: true } }
      : {
          alternates: { canonical: path },
          openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website" },
        }),
  };
}
