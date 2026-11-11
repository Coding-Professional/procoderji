import type { Metadata } from "next";
import { CONTACT_EMAIL } from "../../lib/contact.ts";
import { getSiteUrl } from "../../lib/site.ts";
import { OG_IMAGE, SITE_NAME } from "../../lib/seo.ts";
import type { PortfolioData } from "./types.ts";
import { validateUsername } from "./validation.ts";
import { concisePortfolioText } from "./themes/presentation.ts";

export interface PublicPortfolioPresentation {
  username: string;
  data: PortfolioData;
  searchVisible: boolean;
}

export function publicPortfolioPath(username: string): string {
  if (validateUsername(username).length !== 0) throw new Error("Invalid portfolio username.");
  return `/u/${username}`;
}

/** Only the canonical public address is included; no account identity or draft data enters a report. */
export function portfolioReportHref(username: string): string {
  const address = new URL(publicPortfolioPath(username), getSiteUrl()).href;
  const subject = encodeURIComponent(`Report portfolio: ${username}`);
  const body = encodeURIComponent(`Portfolio URL: ${address}\n\nPlease describe your concern and include any relevant details.`);
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

/** Search visibility belongs to the published snapshot, never the owner's current draft setting. */
export function publicPortfolioMetadata({ username, data, searchVisible }: PublicPortfolioPresentation): Metadata {
  const path = publicPortfolioPath(username);
  const title = concisePortfolioText(`${data.name ?? username} — ${data.headline ?? "Student portfolio"}`, 80);
  const description = concisePortfolioText(data.about?.trim() || data.headline || `${data.name ?? username}'s student portfolio.`, 160);
  return {
    title,
    description,
    robots: { index: searchVisible, follow: true },
    ...(searchVisible ? { alternates: { canonical: path } } : {}),
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      images: [{ ...OG_IMAGE, alt: "Student portfolios on ProCoderJii" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}
