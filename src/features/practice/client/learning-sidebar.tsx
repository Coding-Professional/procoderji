"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, BriefcaseBusiness, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Puzzle, Target, UserRound, X } from "lucide-react";
import { useProgress } from "@/features/progress/progress-provider";

const navigation = [
  { href: "/learn", label: "My learning", icon: LayoutDashboard },
  { href: "/learn/portfolio", label: "My portfolio", icon: BriefcaseBusiness },
  { href: "/practice", label: "Placement practice", icon: Target },
  { href: "/games", label: "Warm-up games", icon: Puzzle },
  { href: "/dashboard", label: "Course notes", icon: BookOpen },
  { href: "/account", label: "Account & data", icon: UserRound },
];
const control = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";

export function LearningSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { user, accountConfigured, syncStatus } = useProgress();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const current = navigation.find(item => pathname === item.href || (item.href === "/practice" && pathname.startsWith("/practice/")))?.label ?? "My learning";

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", close);
    return () => desktop.removeEventListener("change", close);
  }, []);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  const items = (compact: boolean) => <nav aria-label="Learning" className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 space-y-1 overflow-y-auto py-3">
      {navigation.slice(0, -1).map(({ href, label, icon: Icon }, index) => {
        const active = pathname === href || (href === "/practice" && pathname.startsWith("/practice/"));
        return <div key={href} className={index === 2 ? "mt-4 border-t border-slate-100 pt-4" : undefined}>
          <Link href={href} title={compact ? label : undefined} aria-current={active ? "page" : undefined}
            onClick={() => dialog.current?.close()}
            className={`relative flex min-h-11 items-center rounded-lg text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${compact ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-amber-50 font-semibold text-slate-950" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            {active && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-amber-400" />}
            <Icon aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 ${active ? "text-amber-700" : "text-slate-500"}`} />
            <span className={compact ? "sr-only" : "min-w-0"}>{label}</span>
          </Link>
        </div>;
      })}
    </div>
    <div className="mt-auto border-t border-slate-100 pt-3">
      <Link href="/account" title={compact ? "Account & data" : undefined} onClick={() => dialog.current?.close()}
        aria-current={pathname === "/account" ? "page" : undefined}
        className={`flex min-h-11 items-center rounded-lg text-sm font-medium focus-visible:outline-2 focus-visible:outline-slate-900 ${compact ? "justify-center px-2" : "gap-3 px-3"} ${pathname === "/account" ? "bg-amber-50 text-slate-950" : "text-slate-600 hover:bg-slate-100"}`}>
        <UserRound aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span className={compact ? "sr-only" : undefined}>Account &amp; data</span>
      </Link>
    </div>
  </nav>;

  const progress = () => <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-6 text-slate-500">
    <p className="font-semibold text-slate-700">Your progress, your control</p>
    <p>{user ? syncStatus === "synced" ? "Progress synced to your account." : "Progress saves here and syncs to your account." : "Guest progress stays in this browser."}</p>
    {accountConfigured && !user && <Link href="/account" onClick={() => dialog.current?.close()}
      className="mt-1 inline-flex min-h-11 items-center gap-1 font-semibold text-slate-900">Save across devices <ArrowUpRight aria-hidden="true" className="h-3 w-3" /></Link>}
  </div>;

  return <>
    <aside aria-label="Learning sidebar" data-learning-sidebar
      className="sticky top-[var(--site-header-height,76px)] hidden h-[calc(100dvh-var(--site-header-height,76px))] min-h-0 self-start flex-col border-r border-slate-200 bg-white px-3 py-3 lg:flex">
      <div className={`flex min-h-11 items-center ${collapsed ? "justify-center" : "justify-between gap-2 pl-3"}`}>
        {!collapsed && <span className="text-xs font-semibold text-slate-500">My learning</span>}
        <button type="button" onClick={onToggle} aria-label={collapsed ? "Expand learning sidebar" : "Collapse learning sidebar"}
          aria-expanded={!collapsed} title={collapsed ? "Expand learning sidebar" : "Collapse learning sidebar"} className={control}>
          {collapsed ? <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px]" /> : <PanelLeftClose aria-hidden="true" className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {items(collapsed)}
      {!collapsed && progress()}
    </aside>
    <div className="flex items-center border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
      <button ref={trigger} type="button" aria-label="Open learning navigation" aria-controls="learning-drawer" aria-expanded={open}
        onClick={() => { dialog.current?.showModal(); setOpen(true); }} className={`${control} gap-2 px-2 text-sm font-medium text-slate-700`}>
        <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px]" />{current}
      </button>
    </div>
    <dialog ref={dialog} id="learning-drawer" aria-label="Learning navigation"
      onClose={() => { setOpen(false); if (trigger.current?.getClientRects().length) trigger.current.focus(); }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-2rem)] border-r border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
      <div className="flex h-full min-h-0 flex-col px-3 pb-4">
        <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-100 pl-3">
          <span className="text-sm font-semibold">My learning</span>
          <button type="button" aria-label="Close learning navigation" onClick={() => dialog.current?.close()} className={control}>
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {items(false)}
        {progress()}
      </div>
    </dialog>
  </>;
}
