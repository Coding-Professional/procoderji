import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { LatestVideos } from "@/components/landing/latest-videos";

export const metadata: Metadata = { alternates: { canonical: "/" } };

// Re-generate hourly so the latest-videos section stays fresh without a redeploy.
export const revalidate = 3600;

export default function Home() {
  return <LandingPage latestVideos={<LatestVideos />} />;
}
