import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal";

/** Public-page content and legal footer. SiteHeader is supplied by the root layout. */
export function SiteShell({ children, width = "max-w-4xl" }: { children: React.ReactNode; width?: string }) {
    return (
        <div className="min-h-screen px-4 py-8 sm:px-6">
            <div className={`mx-auto ${width}`}>
                <main id="main-content">{children}</main>

                <footer className="mt-12 border-t border-gray-200 pt-6">
                    <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600">
                        {LEGAL_PAGES.map((p) => (
                            <Link key={p.path} href={p.path} className="underline hover:text-gray-900">
                                {p.label}
                            </Link>
                        ))}
                    </nav>
                </footer>
            </div>
        </div>
    );
}
