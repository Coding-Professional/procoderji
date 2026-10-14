import type { MetadataRoute } from "next";
import { getSitemapRoutes } from "@/lib/courses";
import { buildSitemapEntries, getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(getSiteUrl(), getSitemapRoutes());
}
