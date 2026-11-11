import type { MetadataRoute } from "next";
import { getSitemapRoutes } from "@/lib/courses";
import { getGuides, getJobs } from "@/lib/content-data";
import { guideSitemapRoutes } from "@/lib/guides";
import { jobsSitemapRoutes, todayIso } from "@/lib/jobs";
import { legalSitemapRoutes } from "@/lib/legal";
import { readNote } from "@/lib/notes";
import { buildSitemapEntries, getSiteUrl } from "@/lib/site";
import { getSearchVisiblePortfolios } from "@/features/portfolio/server";

// Fresh visibility keeps unpublished/suspended pages out of the discovery list.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(getSiteUrl(), [
    ...getSitemapRoutes((unit) => readNote(unit.path) !== null),
    ...guideSitemapRoutes(getGuides(), (g) => readNote(g.path) !== null),
    ...jobsSitemapRoutes(getJobs(), todayIso()),
    // Legal pages are listed only once the owner's required details are filled in.
    ...legalSitemapRoutes(),
    ...await getSearchVisiblePortfolios(),
  ]);
}
