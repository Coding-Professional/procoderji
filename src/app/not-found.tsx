import Link from "next/link";
import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Error 404
        </p>
        <h1 className="workspace-heading mt-2">We could not find that page</h1>
        <p className="mt-3 text-gray-600">
          The link may be old or mistyped. Try browsing the notes by branch and
          semester.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            prefetch={false}
            className="pcj-button pcj-button-primary"
          >
            Browse notes
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="pcj-button pcj-button-secondary"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
