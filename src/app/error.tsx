"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <main id="main-content" className="min-h-screen flex items-center justify-center px-6 py-16">
            <div role="alert" className="max-w-md text-center">
                <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Something went wrong</p>
                <h1 className="mt-2 text-3xl font-extrabold text-gray-900">This page could not be loaded</h1>
                <p className="mt-3 text-gray-600">Please try again. If it keeps happening, email us and we will look into it.</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                        Try again
                    </button>
                    <Link href="/" className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50">
                        Go to home
                    </Link>
                </div>
            </div>
        </main>
    );
}
