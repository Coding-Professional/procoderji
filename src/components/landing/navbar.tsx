"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    ArrowUpRight,
    BookOpen,
    BriefcaseBusiness,
    FileText,
    Info,
    LayoutDashboard,
    Mail,
    Menu,
    Puzzle,
    Target,
    X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGuides, getJobs } from "@/lib/content-data";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const toggle = useRef<HTMLButtonElement>(null);
    const links = [
        { href: "/practice", label: "Placement practice", icon: Target },
        { href: "/learn", label: "My learning", icon: LayoutDashboard },
        { href: "/#about", label: "About", icon: Info },
        { href: "/games", label: "Games", icon: Puzzle },
        { href: "/#contact", label: "Contact", icon: Mail },
        ...(getGuides().length
            ? [{ href: "/guides", label: "Guides", icon: FileText }]
            : []),
        ...(getJobs().length
            ? [{ href: "/jobs", label: "Jobs", icon: BriefcaseBusiness }]
            : []),
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
        <nav
            aria-label="Main"
            className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md"
        >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
                <Link
                    href="/"
                    aria-label="ProCoderJii home"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-gray-900 sm:text-xl"
                >
                    <Image
                        src="/logo.png"
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    ProCoderJii
                </Link>
                <div className="hidden items-center gap-5 text-sm font-medium text-gray-600 xl:flex">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="inline-flex min-h-11 items-center transition-colors hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/dashboard"
                        className="inline-flex min-h-11 items-center rounded-full bg-gray-900 px-5 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-gray-800"
                    >
                        Browse Notes
                    </Link>
                </div>
                <button
                    ref={toggle}
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-amber-50 xl:hidden"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isOpen}
                    aria-controls="mobile-menu"
                >
                    {isOpen ? (
                        <X className="h-5 w-5" aria-hidden="true" />
                    ) : (
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    )}
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-gray-100 bg-white xl:hidden"
                    >
                        <div className="grid max-h-[calc(100dvh-76px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain px-4 py-4 text-sm font-medium text-gray-700 sm:px-6">
                            {links.map(({ href, label, icon: Icon }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex min-h-12 items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-3 transition-colors hover:border-amber-200 hover:bg-amber-50"
                                >
                                    <Icon
                                        aria-hidden="true"
                                        className="h-4 w-4 shrink-0 text-amber-700"
                                    />
                                    <span>{label}</span>
                                </Link>
                            ))}
                            <Link
                                href="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
                            >
                                <BookOpen
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                />
                                Browse Notes
                                <ArrowUpRight
                                    aria-hidden="true"
                                    className="ml-auto h-4 w-4"
                                />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
