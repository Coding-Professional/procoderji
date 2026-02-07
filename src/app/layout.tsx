import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProCoderJii Notes | Free Engineering Notes & Study Material",
  description:
    "Free notes, PYQs, and study material for engineering students from the ProCoderJii community.",
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
          <main className="relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

