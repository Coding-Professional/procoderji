"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  LayoutDashboard,
  Puzzle,
  Target,
  UserRound,
} from "lucide-react";
import { useProgress } from "@/features/progress/progress-provider";

const navigation = [
  { href: "/learn", label: "My learning", icon: LayoutDashboard },
  { href: "/learn/portfolio", label: "My portfolio", icon: UserRound },
  { href: "/practice", label: "Placement practice", icon: Target },
  { href: "/games", label: "Warm-up games", icon: Puzzle },
  { href: "/dashboard", label: "Course notes", icon: BookOpen },
  { href: "/account", label: "Account & data", icon: UserRound },
];

export function LearningShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, accountConfigured, syncStatus, storageAvailable } =
    useProgress();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex min-h-11 items-center gap-3 font-extrabold tracking-tight"
          >
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span>
              ProCoderJii <span className="ml-1 hidden text-slate-500 sm:inline">Learn</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
              Free practice beta
            </span>
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              {user ? "My account" : "Guest learner"}
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white px-4 py-4 lg:min-h-[calc(100vh-85px)] lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
          <nav
            aria-label="Learning"
            className="flex flex-wrap gap-1 lg:flex-col lg:gap-2"
          >
            {navigation.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href ||
                (href === "/practice" && pathname.startsWith("/practice/"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 hidden border-t border-slate-200 pt-6 text-xs leading-6 text-slate-500 lg:block">
            <p className="font-semibold text-slate-700">
              Your progress, your control
            </p>
            <p>
              {user
                ? syncStatus === "synced"
                  ? "Progress synced to your account."
                  : "Progress saves here and syncs to your account."
                : "Guest progress stays in this browser."}
            </p>
            {accountConfigured && !user && (
              <Link
                href="/account"
                className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-slate-900"
              >
                Save across devices{" "}
                <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
              </Link>
            )}
          </div>
        </aside>
        <main
          id="main-content"
          className="min-w-0 px-4 py-8 sm:px-7 sm:py-10 lg:px-10"
        >
          {!storageAvailable && (
            <p
              role="status"
              className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
            >
              Browser storage is unavailable. You can practise, but progress on
              this device may be lost when you leave.
            </p>
          )}
          {children}
          <footer className="mt-14 flex flex-wrap gap-5 border-t border-slate-200 pt-6 text-xs text-slate-500">
            <span>Independent practice. No hiring guarantees.</span>
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
            <Link href="/terms" className="underline">
              Terms
            </Link>
            <Link
              href="https://github.com/procoderji-com/procoderji"
              className="underline"
            >
              Contribute on GitHub
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
