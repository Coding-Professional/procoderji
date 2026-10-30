import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { DigitRecall } from "./digit-recall";

export const metadata = pageMetadata({
  title: "Digit Recall Game",
  description: "Play Digit Recall for free. Remember a number for a few seconds, type it from memory and build up across five rounds.",
  path: "/games/digit-recall",
});

export default function DigitRecallPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/games" className="inline-flex min-h-11 items-center gap-1 font-semibold text-gray-600 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"><ChevronLeft aria-hidden="true" className="h-5 w-5" /> All games</Link>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Digit Recall</h1>
      <p className="mt-3 leading-relaxed text-gray-600">Remember each number for four seconds, then type it from memory. Numbers get longer over five rounds.</p>
      <DigitRecall />
    </main>
  );
}
