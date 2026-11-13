"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGuides, getJobs } from "@/lib/content-data";

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPastHero, setIsPastHero] = useState(false);
    const [navbarHeight, setNavbarHeight] = useState(0);
    const navigation = useRef<HTMLElement>(null);

    useEffect(() => {
        const navbar = navigation.current;
        const hero = navbar?.parentElement?.querySelector(":scope > section");
        if (!navbar || !hero) return;
        let fixed = navbar.classList.contains("fixed");

        const updateBackground = () => {
            const barHeight = navbar.firstElementChild?.getBoundingClientRect().height ?? 0;
            // Reserve its original space when fixed; the dropdown then overlays content.
            if (!fixed) setNavbarHeight(navbar.getBoundingClientRect().height);
            fixed = hero.getBoundingClientRect().bottom <= barHeight;
            setIsPastHero(fixed);
        };

        updateBackground();
        window.addEventListener("scroll", updateBackground, { passive: true });
        window.addEventListener("resize", updateBackground);
        const observer = new ResizeObserver(updateBackground);
        observer.observe(hero);
        observer.observe(navbar);

        return () => {
            window.removeEventListener("scroll", updateBackground);
            window.removeEventListener("resize", updateBackground);
            observer.disconnect();
        };
    }, []);

    // Only link sections that have content.
    const sections = [
        ...(getGuides().length > 0 ? [{ href: "/guides", label: "Guides" }] : []),
        ...(getJobs().length > 0 ? [{ href: "/jobs", label: "Jobs" }] : []),
    ];

    return (
        <>
        <nav ref={navigation} aria-label="Main" className={`top-0 z-50 ${isPastHero ? "fixed inset-x-0 bg-white/90 backdrop-blur-md" : "sticky bg-transparent"}`}>
            <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-gray-900">
                    <Image
                        src="/logo.png"
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    ProCoderJii
                </div>

                {/* Desktop Menu */}
                <div className="hidden xl:flex items-center gap-5 text-sm font-medium text-gray-600">
                    <Link href="/practice" className="inline-flex min-h-11 items-center font-semibold hover:text-primary">Placement practice</Link>
                    <Link href="/learn" className="inline-flex min-h-11 items-center font-semibold hover:text-primary">My learning</Link>
                    <a href="#about" className="hover:text-primary transition-colors">About</a>
                    <Link href="/games" className="hover:text-primary transition-colors">Games</Link>
                    <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
                    {sections.map((s) => (
                        <Link key={s.href} href={s.href} className="hover:text-primary transition-colors">{s.label}</Link>
                    ))}
                    <Link
                        href="/dashboard"
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl font-semibold"
                    >
                        Browse Notes
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="xl:hidden min-h-11 min-w-11 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? "Close menu" : "Open menu"}
                    aria-expanded={isOpen}
                    aria-controls="mobile-menu"
                >
                    {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        id="mobile-menu"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="xl:hidden border-t border-gray-100 bg-white overflow-hidden"
                    >
                        <div className="px-6 py-8 flex flex-col gap-6 text-lg font-medium text-gray-600">
                            <Link href="/practice" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center font-semibold">Placement practice</Link>
                            <Link href="/learn" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center font-semibold">My learning</Link>
                            <a
                                href="#about"
                                className="hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                About
                            </a>
                            <Link
                                href="/games"
                                className="hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Games
                            </Link>
                            <a
                                href="#contact"
                                className="hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                            >
                                Contact
                            </a>
                            {sections.map((s) => (
                                <Link
                                    key={s.href}
                                    href={s.href}
                                    className="hover:text-primary transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {s.label}
                                </Link>
                            ))}
                            <Link
                                href="/dashboard"
                                className="px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg text-center"
                                onClick={() => setIsOpen(false)}
                            >
                                Browse Notes
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
        {isPastHero && <div aria-hidden="true" style={{ height: navbarHeight }} />}
        </>
    );
}
