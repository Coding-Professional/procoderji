import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { isNonProductionDeployment } from "@/lib/deployment";

export default function robots(): MetadataRoute.Robots {
  if (isNonProductionDeployment(process.env.DEPLOYMENT_ENVIRONMENT, process.env.VERCEL_ENV)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const siteUrl = getSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
