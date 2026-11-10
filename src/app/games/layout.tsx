import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white/80 text-gray-900">
      <header className="border-b border-gray-200 bg-white/95">
        <nav aria-label="Games" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/games" className="text-lg font-extrabold tracking-tight hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">ProCoderJii Games</Link>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link href="/practice" className="inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Placement practice</Link>
            <Link href="/games" className="inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">All games</Link>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"><BookOpen aria-hidden="true" className="h-4 w-4" /> Notes</Link>
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t border-gray-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to ProCoderJii</Link>
        </div>
      </footer>
    </div>
  );
}
