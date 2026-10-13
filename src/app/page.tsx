import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";
import { getSiteUrl } from "@/lib/site";

// Canonical URL only once the canonical domain is configured.
export const metadata: Metadata = getSiteUrl() ? { alternates: { canonical: "/" } } : {};

export default function Home() {
  return <LandingPage />;
}
