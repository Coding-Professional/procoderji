import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page not found",
    robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <main id="main-content" className="min-h-screen flex items-center justify-center px-6 py-16">
            <div className="max-w-md text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Error 404</p>
                <h1 className="mt-2 text-3xl font-extrabold text-gray-900">We could not find that page</h1>
                <p className="mt-3 text-gray-600">
                    The link may be old or mistyped. Try browsing the notes by branch and semester.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/dashboard" prefetch={false} className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
                        Browse notes
                    </Link>
                    <Link href="/" prefetch={false} className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                        Go to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
