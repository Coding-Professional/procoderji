import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

/** Shared brand and navigation for public content and policy pages. */
export function SiteShell({
  children,
  width = "max-w-4xl",
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content" className={`public-content ${width}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
