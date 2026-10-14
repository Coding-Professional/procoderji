import type { MetadataRoute } from "next";
import { getSitemapRoutes } from "@/lib/courses";
import { legalSitemapRoutes } from "@/lib/legal";
import { buildSitemapEntries, getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  // Legal pages are listed only once the owner's required details are filled in.
  return buildSitemapEntries(getSiteUrl(), [...getSitemapRoutes(), ...legalSitemapRoutes()]);
}
