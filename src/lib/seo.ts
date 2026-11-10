import type { Metadata } from "next";

export const SITE_NAME = "ProCoderJii";
/** Social-sharing image (public/og.png, 1200x630). Set on every indexable page: a page-level openGraph replaces the root one. */
export const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "ProCoderJii Notes" };

export const SITE_DESCRIPTION =
  "Free campus-placement practice, answer explanations, and learning progress for engineering students. Build aptitude, reasoning, verbal, and programming skills.";

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
          openGraph: { title, description, url: path, siteName: SITE_NAME, type: "website", images: [OG_IMAGE] },
          twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
        }),
  };
}
