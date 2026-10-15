import type { MetadataRoute } from "next";
import { getSitemapRoutes } from "@/lib/courses";
import { getGuides, getJobs } from "@/lib/content-data";
import { guideSitemapRoutes } from "@/lib/guides";
import { jobsSitemapRoutes, todayIso } from "@/lib/jobs";
import { legalSitemapRoutes } from "@/lib/legal";
import { readNote } from "@/lib/notes";
import { buildSitemapEntries, getSiteUrl } from "@/lib/site";

// Regenerate daily so /jobs drops out as soon as nothing is open.
export const revalidate = 86400;

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(getSiteUrl(), [
    ...getSitemapRoutes((unit) => readNote(unit.path) !== null),
    ...guideSitemapRoutes(getGuides(), (g) => readNote(g.path) !== null),
    ...jobsSitemapRoutes(getJobs(), todayIso()),
    // Legal pages are listed only once the owner's required details are filled in.
    ...legalSitemapRoutes(),
  ]);
}
