import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicPortfolioPage } from "@/features/portfolio/public-page";
import { publicPortfolioMetadata } from "@/features/portfolio/public-presentation";
import { getPublishedPortfolio } from "@/features/portfolio/server";

// A fresh publication-state check runs before cached published content is displayed.
// Unpublished or suspended records must never survive as a cached HTML page.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await getPublishedPortfolio(username);
  if (!portfolio) return { title: "Portfolio not found", robots: { index: false, follow: false } };
  return publicPortfolioMetadata(portfolio);
}

export default async function PortfolioPage({ params }: Props) {
  const { username } = await params;
  const portfolio = await getPublishedPortfolio(username);
  if (!portfolio) notFound();
  return <PublicPortfolioPage {...portfolio} />;
}
