import Link from "next/link";
import { ArrowRight, Brain, Hash } from "lucide-react";

export function GamesSection() {
  return (
    <section id="games" aria-labelledby="games-heading" className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-200 bg-amber-50/90 p-6 shadow-sm sm:p-10 lg:p-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="text-sm font-bold uppercase tracking-widest text-amber-800">Free student practice</span>
            <h2 id="games-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Give your brain a quick workout</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700">Try short pattern and memory challenges between study sessions. Get instant feedback and practise again whenever you like.</p>
          </div>
          <Link href="/games" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">
            Explore games <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-200 bg-white p-5">
            <Brain aria-hidden="true" className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 text-lg font-bold text-gray-900">Pattern Sprint</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">Find the next number in a sequence.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white p-5">
            <Hash aria-hidden="true" className="h-6 w-6 text-amber-700" />
            <h3 className="mt-3 text-lg font-bold text-gray-900">Digit Recall</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">Remember a number before it disappears.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
