import Link from "next/link";
import { ArrowRight, Brain, Hash, Timer } from "lucide-react";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Free Practice Games",
  description: "Play free pattern and memory practice games for students. Short challenges with instant scores and feedback, with no account required.",
  path: "/games",
});

const games = [
  { href: "/games/pattern-sprint", icon: Brain, title: "Pattern Sprint", description: "Spot the next number in eight sequences. See the rule after every answer.", detail: "8 questions · 60 seconds" },
  { href: "/games/digit-recall", icon: Hash, title: "Digit Recall", description: "Memorise a number, then type it after it disappears. Each round gets longer.", detail: "5 rounds · self-paced" },
];

export default function GamesPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-3xl">
        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-900">Free · No login needed</span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">Practice Games</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600">Take a quick break from reading and challenge your reasoning or memory. Start with a short round and use the feedback to improve.</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {games.map((game) => (
          <article key={game.href} className="flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><game.icon aria-hidden="true" className="h-6 w-6" /></div>
            <h2 className="mt-6 text-2xl font-bold">{game.title}</h2>
            <p className="mt-2 flex-1 leading-relaxed text-gray-600">{game.description}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600"><Timer aria-hidden="true" className="h-4 w-4" /> {game.detail}</p>
            <Link href={game.href} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Play {game.title}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </article>
        ))}
      </div>
      <p className="mt-8 text-sm leading-relaxed text-gray-600">These are original practice exercises for skill building, not official company assessments.</p>
    </main>
  );
}
