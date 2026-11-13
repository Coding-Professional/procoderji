"use client";

import React, { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    // Remember which route the drawer was opened on: navigating elsewhere closes it
    // without needing an effect.
    const [openOnPath, setOpenOnPath] = useState<string | null>(null);
    const isSidebarOpen = openOnPath === pathname;
    const drawer = useRef<HTMLDivElement>(null);
    const toggle = useRef<HTMLButtonElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const closeSidebar = () => setOpenOnPath(null);

    // Keep keyboard focus and scrolling inside the mobile drawer.
    useEffect(() => {
        if (!isSidebarOpen) return;
        const trigger = toggle.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const frame = requestAnimationFrame(() =>
            closeButton.current?.focus({ preventScroll: true }),
        );
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenOnPath(null);
            if (e.key === "Tab") {
                const items = [
                    ...(drawer.current?.querySelectorAll<HTMLElement>(
                        'a[href],button:not(:disabled),[tabindex="0"]',
                    ) ?? []),
                ].filter((item) => item.getClientRects().length);
                const first = items[0];
                const last = items.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };
        const desktop = window.matchMedia("(min-width: 768px)");
        const onResize = () => {
            if (desktop.matches) setOpenOnPath(null);
        };
        desktop.addEventListener("change", onResize);
        document.addEventListener("keydown", onKey);
        return () => {
            cancelAnimationFrame(frame);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKey);
            desktop.removeEventListener("change", onResize);
            if (!desktop.matches) trigger?.focus({ preventScroll: true });
        };
    }, [isSidebarOpen]);

    return (
        <div className="flex min-h-screen text-foreground relative">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeSidebar}
                            aria-hidden="true"
                            className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            ref={drawer}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 200,
                            }}
                            className="md:hidden fixed inset-y-0 left-0 z-[70] w-72 max-w-[calc(100vw-2rem)] bg-background border-r border-border shadow-2xl"
                        >
                            <div className="absolute top-2 right-2 z-50">
                                <button
                                    ref={closeButton}
                                    type="button"
                                    onClick={closeSidebar}
                                    aria-label="Close navigation menu"
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-accent rounded-md"
                                >
                                    <X className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>
                            <AppSidebar className="w-full h-full border-none" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <div className="hidden md:block sticky top-0 h-screen">
                <AppSidebar />
            </div>

            {/* Main Content */}
            <main
                id="main-content"
                className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
            >
                <div className="border-b border-border bg-background/80 px-4 py-3 md:hidden">
                    <button ref={toggle} type="button" onClick={() => setOpenOnPath(pathname)} aria-label="Open navigation menu" aria-expanded={isSidebarOpen}
                        className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-accent">
                        <Menu className="h-5 w-5" aria-hidden="true" />Browse Notes
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto">{children}</div>
                </div>
            </main>
        </div>
    );
}
