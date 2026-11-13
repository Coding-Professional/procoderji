import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { PatternSprint } from "./pattern-sprint";

export const metadata = pageMetadata({
  title: "Pattern Sprint Game",
  description:
    "Play Pattern Sprint for free. Solve eight number sequences against the clock and learn the rule behind every answer.",
  path: "/games/pattern-sprint",
});

export default function PatternSprintPage() {
  return (
    <main
      id="main-content"
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14"
    >
      <Link
        href="/games"
        className="inline-flex min-h-11 items-center gap-1 font-semibold text-muted-foreground hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
      >
        <ChevronLeft aria-hidden="true" className="h-5 w-5" /> All games
      </Link>
      <h1 className="workspace-heading mt-5">Pattern Sprint</h1>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        Find the next number in each sequence. You have 60 seconds for eight
        questions.
      </p>
      <PatternSprint />
    </main>
  );
}
