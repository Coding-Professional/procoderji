import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { isNonProductionDeployment } from "@/lib/deployment";

const siteUrl = getSiteUrl();
const dmSans = localFont({
  src: "../../public/fonts/dm-sans-variable.ttf",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ProCoderJii | Placement Practice & Engineering Learning",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  ...(isNonProductionDeployment(
    process.env.DEPLOYMENT_ENVIRONMENT,
    process.env.VERCEL_ENV,
  )
    ? { robots: { index: false, follow: false } }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className={`antialiased font-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {isNonProductionDeployment(
          process.env.DEPLOYMENT_ENVIRONMENT,
          process.env.VERCEL_ENV,
        ) && (
          <div
            role="status"
            className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
          >
            Staging preview. Use sample data; accounts and saved work here are
            separate from production.
          </div>
        )}
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
