"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useProgress } from "@/features/progress/progress-provider";

const links = [
  { href: "/dashboard", label: "Browse Notes" },
  { href: "/practice", label: "Placement practice" },
  { href: "/games", label: "Games" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

/** The sole application header. Page shells own content navigation, never another brand bar. */
export function SiteHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const workspace = pathname === "/account" || pathname.startsWith("/learn") || pathname.startsWith("/practice");
  const { user } = useProgress();
  const [open, setOpen] = useState<{ path: string; menu: "site" | "learner" } | null>(null);
  const menu = open?.path === pathname ? open.menu : null;
  const [pastHero, setPastHero] = useState(false);
  const [height, setHeight] = useState(76);
  const [hash, setHash] = useState("");
  const header = useRef<HTMLElement>(null);
  const siteToggle = useRef<HTMLButtonElement>(null);
  const learnerToggle = useRef<HTMLButtonElement>(null);
  const fixed = home && pastHero;
  const close = () => setOpen(null);

  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const update = () => {
      const measuredHeight = element.getBoundingClientRect().height;
      setHeight(measuredHeight);
      element.parentElement?.style.setProperty("--site-header-height", `${measuredHeight}px`);
      const hero = document.querySelector("[data-home-hero]");
      setPastHero(home && !!hero && hero.getBoundingClientRect().bottom <= element.getBoundingClientRect().height);
      setHash(window.location.hash);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const hero = document.querySelector("[data-home-hero]");
    if (hero) observer.observe(hero);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("hashchange", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("hashchange", update);
    };
  }, [home]);

  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(null);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        (menu === "site" ? siteToggle : learnerToggle).current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const resize = () => { if (desktop.matches && menu === "site") setOpen(null); };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keydown);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keydown);
      desktop.removeEventListener("change", resize);
    };
  }, [menu]);

  const active = (href: string) => href === "/#contact"
    ? home && hash === "#contact"
    : pathname === href || pathname.startsWith(`${href}/`) || (href === "/dashboard" && pathname.startsWith("/courses"));
  const renderLinks = () => links.map(({ href, label }) => (
    <Link key={href} href={href} onClick={() => { setHash(href === "/#contact" ? "#contact" : ""); close(); }}
      aria-current={active(href) ? "page" : undefined}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-full px-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 hover:text-primary ${active(href) ? "text-gray-900 underline decoration-amber-400 decoration-2 underline-offset-8" : "text-gray-600"}`}>
      {label}
    </Link>
  ));

  return <>
    <header ref={header} data-site-header style={{ "--site-header-height": `${height}px` } as CSSProperties}
      className={`z-50 w-full ${fixed ? "fixed inset-x-0 top-0 bg-white/90 backdrop-blur-md" : home ? "relative bg-transparent" : `${workspace ? "sticky top-0" : "relative"} border-b border-gray-200 bg-white`}`}>
      <div className={`relative mx-auto grid ${workspace ? "w-full" : "max-w-7xl"} grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-4 py-4 sm:px-6 lg:flex lg:justify-between lg:gap-3`}>
        <Link href="/" onClick={close} aria-current={home && !hash ? "page" : undefined}
          className="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:text-xl">
          <Image src="/logo.png" alt="" width={32} height={32} className="h-7 w-7 rounded-lg sm:h-8 sm:w-8" />
          ProCoderJii
        </Link>
        <nav aria-label="Main" className="order-3 col-span-2 mt-2 hidden items-center justify-center gap-1 text-sm md:flex lg:order-none lg:mt-0 lg:gap-2">
          {renderLinks()}
        </nav>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <div className="relative">
            <button ref={learnerToggle} type="button" aria-expanded={menu === "learner"} aria-controls="learner-menu"
              onClick={() => setOpen(menu === "learner" ? null : { path: pathname, menu: "learner" })}
              className={`inline-flex min-h-11 min-w-11 items-center gap-1 rounded-full px-1 text-xs font-semibold text-gray-900 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 sm:gap-2 sm:px-3 sm:text-sm ${pathname.startsWith("/learn") || pathname === "/account" ? "underline decoration-amber-400 decoration-2 underline-offset-4" : ""}`}>
              <UserRound aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{user ? "My account" : "Guest learner"}</span>
              <ChevronDown aria-hidden="true" className="h-3 w-3 shrink-0" />
            </button>
            {menu === "learner" && <nav id="learner-menu" aria-label="Learner" className="absolute right-0 top-full z-10 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2 text-sm font-semibold text-gray-900 shadow-lg">
              {[{ href: "/learn", label: "My learning" }, { href: "/learn/portfolio", label: "My portfolio" }, { href: "/account", label: "Account & data" }].map(link =>
                <Link key={link.href} href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-lg px-3 hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-gray-900 ${pathname === link.href ? "bg-amber-50" : ""}`}>{link.label}</Link>)}
            </nav>}
          </div>
          <button ref={siteToggle} type="button" onClick={() => setOpen(menu === "site" ? null : { path: pathname, menu: "site" })}
            aria-label={menu === "site" ? "Close menu" : "Open menu"} aria-expanded={menu === "site"} aria-controls="mobile-menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-900 md:hidden">
            {menu === "site" ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
        {menu === "site" && <nav id="mobile-menu" aria-label="Main" className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--site-header-height))] overflow-y-auto border-t border-gray-100 bg-white px-4 py-4 shadow-lg md:hidden">
          <div className="flex flex-col gap-2 text-sm">{renderLinks()}</div>
        </nav>}
      </div>
    </header>
    {fixed && <div aria-hidden="true" style={{ height }} />}
  </>;
}
