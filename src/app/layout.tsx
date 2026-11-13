import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { MotionProvider } from "@/components/motion-provider";
import { isNonProductionDeployment } from "@/lib/deployment";

const siteUrl = getSiteUrl();

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
  ...(isNonProductionDeployment(process.env.DEPLOYMENT_ENVIRONMENT, process.env.VERCEL_ENV)
    ? { robots: { index: false, follow: false } }
    : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`antialiased font-sans`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gray-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {isNonProductionDeployment(process.env.DEPLOYMENT_ENVIRONMENT, process.env.VERCEL_ENV) && (
          <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
            Staging preview. Use sample data; accounts and saved work here are separate from production.
          </div>
        )}
        <MotionProvider>
        {/* Background Layer */}
        <div className="min-h-screen w-full  relative overflow-hidden">
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `
       linear-gradient(to right, #f0f0f0 1px, transparent 1px),
       linear-gradient(to bottom, #f0f0f0 1px, transparent 1px),
       radial-gradient(circle 600px at 0% 200px, #fde68a, transparent),
       radial-gradient(circle 600px at 100% 200px, #fcd34d, transparent)
     `,
              backgroundSize: "20px 20px, 20px 20px, 100% 100%, 100% 100%",
            }}
          />

          {/* Main Content */}
          <div className="relative z-10">
            {children}
          </div>
        </div>
        </MotionProvider>
      </body>
    </html>
  );
}

