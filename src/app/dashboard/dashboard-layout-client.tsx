"use client";

import React, { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Remember which route the drawer was opened on: navigating elsewhere closes it
    // without needing an effect.
    const [openOnPath, setOpenOnPath] = useState<string | null>(null);
    const isSidebarOpen = openOnPath === pathname;
    const closeSidebar = () => setOpenOnPath(null);

    // Escape closes the mobile drawer.
    useEffect(() => {
        if (!isSidebarOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenOnPath(null);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isSidebarOpen]);

    return (
        <div className="flex min-h-screen text-foreground relative">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="font-bold text-lg">ProCoderJii</div>
                <button
                    type="button"
                    onClick={() => setOpenOnPath(pathname)}
                    aria-label="Open navigation menu"
                    aria-expanded={isSidebarOpen}
                    className="p-2 hover:bg-accent rounded-md"
                >
                    <Menu className="w-6 h-6" aria-hidden="true" />
                </button>
            </div>

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
                            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Navigation menu"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border shadow-2xl"
                        >
                            <div className="absolute top-2 right-2 z-50">
                                <button
                                    type="button"
                                    onClick={closeSidebar}
                                    aria-label="Close navigation menu"
                                    className="p-2 hover:bg-accent rounded-md"
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
            <main id="main-content" className="flex-1 flex flex-col min-w-0 overflow-hidden relative pt-16 md:pt-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
                    <div className="max-w-6xl mx-auto">{children}</div>
                </div>
            </main>
        </div>
    );
}
