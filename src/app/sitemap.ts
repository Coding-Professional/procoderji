import type { MetadataRoute } from "next";
import { getContentRoutes } from "@/lib/courses";
import { buildSitemapEntries, getSiteUrl } from "@/lib/site";

// Empty until NEXT_PUBLIC_SITE_URL (the confirmed canonical domain) is set.
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(getSiteUrl(), getContentRoutes());
}
