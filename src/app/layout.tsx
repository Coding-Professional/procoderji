import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { MotionProvider } from "@/components/motion-provider";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ProCoderJii Notes | Free Engineering Notes & Study Material",
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: "/og.png" }],
  },
  twitter: { card: "summary_large_image" },
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

