import Link from "next/link";
import { PortfolioPreview } from "./themes/portfolio-preview";
import { portfolioReportHref, type PublicPortfolioPresentation } from "./public-presentation";

export function PublicPortfolioPage({ username, data }: PublicPortfolioPresentation) {
  const developer = data.theme === "developer";
  const chrome = developer ? "text-slate-300 hover:text-white focus-visible:outline-amber-300" : "text-slate-600 hover:text-slate-950 focus-visible:outline-amber-700";
  return (
    <div className={`min-h-screen px-4 py-5 sm:px-6 sm:py-8 ${developer ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-end gap-x-6 gap-y-2">
          <Link href="/learn/portfolio" prefetch={false} className={`inline-flex min-h-11 items-center rounded-lg text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${chrome}`}>
            Create your portfolio
          </Link>
        </div>
        <main id="main-content" className="min-w-0">
          <PortfolioPreview data={data} />
        </main>
        <footer className={`mt-6 flex flex-col items-start justify-between gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center ${developer ? "text-slate-400" : "text-slate-500"}`}>
          <p className="min-w-0 max-w-full leading-6 [overflow-wrap:anywhere]">Shared by @{username} on ProCoderJii.</p>
          <nav aria-label="Portfolio help and policies" className="flex flex-wrap items-center gap-x-5">
            <a href={portfolioReportHref(username)} className={`inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${chrome}`}>Report this page</a>
            <Link href="/privacy" prefetch={false} className={`inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${chrome}`}>Privacy</Link>
            <Link href="/terms" prefetch={false} className={`inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${chrome}`}>Terms</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
