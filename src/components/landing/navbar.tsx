"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { getGuides, getJobs } from "@/lib/content-data";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const links = [
    { href: "/practice", label: "Practice" },
    { href: "/dashboard", label: "Browse Notes" },
    { href: "/games", label: "Games" },
    { href: "/learn/portfolio", label: "Portfolio" },
    { href: "/#about", label: "About" },
    { href: "/#contact", label: "Contact" },
    ...(getGuides().length ? [{ href: "/guides", label: "Guides" }] : []),
    ...(getJobs().length ? [{ href: "/jobs", label: "Jobs" }] : []),
  ];
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [isOpen]);
  return (
    <header className="site-header">
      <div className="page-container site-header-inner">
        <Brand />
        <nav aria-label="Main" className="site-navigation hidden xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/learn"
          className="pcj-button pcj-button-primary hidden xl:inline-flex"
        >
          My learning <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
        <button
          ref={toggle}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border xl:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-controls="mobile-menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X aria-hidden="true" size={21} />
          ) : (
            <Menu aria-hidden="true" size={21} />
          )}
        </button>
      </div>
      {isOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile main"
          className="page-container border-t border-border py-4 xl:hidden"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                aria-current={pathname === link.href ? "page" : undefined}
                className="flex min-h-12 items-center rounded-md px-2 text-sm font-medium hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <Link
            href="/learn"
            onClick={() => setIsOpen(false)}
            className="pcj-button pcj-button-primary mt-3 w-full"
          >
            My learning <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}
