import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white/80 text-gray-900">
      {children}
      <footer className="border-t border-gray-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to ProCoderJii</Link>
        </div>
      </footer>
    </div>
  );
}
