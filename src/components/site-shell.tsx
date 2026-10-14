import Link from "next/link";
import Image from "next/image";
import { getGuides, getJobs } from "@/lib/content-data";
import { LEGAL_PAGES } from "@/lib/legal";

/** Simple page frame (header, main landmark, legal footer) for public pages outside the notes dashboard. */
export function SiteShell({ children, width = "max-w-4xl" }: { children: React.ReactNode; width?: string }) {
    // Only link sections that actually have content.
    const links = [
        { href: "/dashboard", label: "Notes" },
        ...(getGuides().length > 0 ? [{ href: "/guides", label: "Guides" }] : []),
        ...(getJobs().length > 0 ? [{ href: "/jobs", label: "Jobs" }] : []),
    ];

    return (
        <div className="min-h-screen px-4 py-8 sm:px-6">
            <div className={`mx-auto ${width}`}>
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Image src="/logo.svg" alt="" width={28} height={28} className="rounded-lg" />
                        ProCoderJii Notes
                    </Link>
                    <nav aria-label="Main" className="flex items-center gap-5 text-sm font-semibold text-gray-700">
                        {links.map((l) => (
                            <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </header>

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
