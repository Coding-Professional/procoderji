import type { Metadata } from "next";
import { getSiteUrl } from "./site";

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
 * Per-page metadata. Canonical/Open Graph URLs are only emitted once the
 * canonical domain is configured (NEXT_PUBLIC_SITE_URL); until then they are
 * omitted rather than guessed.
 */
export function pageMetadata({ title, description, path, noindex }: PageMetaInput): Metadata {
  const siteUrl = getSiteUrl();
  return {
    title,
    description,
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    ...(siteUrl && !noindex
      ? {
          alternates: { canonical: path },
          openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website" },
        }
      : {}),
  };
}
