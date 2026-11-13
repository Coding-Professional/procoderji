"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useProgress } from "@/features/progress/progress-provider";
import { LearningSidebar } from "./learning-sidebar";

export function LearningShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { storageAvailable } = useProgress();

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div style={{ "--learning-sidebar-width": collapsed ? "4.5rem" : "15rem" } as CSSProperties}
      className="grid w-full lg:grid-cols-[var(--learning-sidebar-width)_minmax(0,1fr)]">
      <LearningSidebar collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} />
      <main id="main-content" className="min-w-0 px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
        {!storageAvailable && <p role="status" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          Browser storage is unavailable. You can practise, but progress on this device may be lost when you leave.
        </p>}
        {children}
        <footer className="mt-14 flex flex-wrap gap-5 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span>Independent practice. No hiring guarantees.</span>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="https://github.com/procoderji-com/procoderji" className="underline">Contribute on GitHub</Link>
        </footer>
      </main>
    </div>
  </div>;
}
