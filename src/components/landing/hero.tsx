"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingLogo } from "@/components/floating-logo";
import { useSearchParams, useRouter } from "next/navigation";
import { getCourses } from "@/lib/courses";
import { dashboardHref } from "@/lib/catalog";

// Only branches that exist in the catalogue are offered, so every link resolves.
const branches = getCourses().flatMap((course) =>
    course.branches.map((branch) => ({
        courseSlug: course.slug,
        slug: branch.slug,
        label: branch.short ?? branch.title,
        semesters: branch.semesters,
    }))
);

export function Hero() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // The URL is the single source of truth; unknown ?branch= values are ignored.
    const branchParam = searchParams.get("branch");
    const selected = branches.find((b) => b.slug === branchParam) ?? null;
    const step: "branch" | "semester" = selected ? "semester" : "branch";

    const setBranch = (slug: string | null) => {
        router.push(slug ? `/?branch=${encodeURIComponent(slug)}` : "/", { scroll: false });
    };

    return (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />

            <FloatingLogo />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl mx-auto space-y-6 sm:space-y-8 relative z-10"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-primary shadow-sm mb-4">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ProCoderJii YouTube Notes Hub</span>
                </div>

                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] break-words">
                    Study Material for <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-amber-500 to-gray-900">
                        ProCoderJii Community
                    </span>
                </h1>

                <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    Free notes and unit-wise guides to go with the ProCoderJii YouTube videos. Pick your branch and
                    semester to see what is available - more material is added as it is reviewed.
                </p>
            </motion.div>

            {/* Selection Interface */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-10 sm:mt-16 w-full max-w-3xl relative z-10"
            >
                <div className="border border-gray-800 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-xl rounded-3xl p-1 overflow-hidden ring-1 ring-gray-900/5">
                    {/* Progress Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-white/50">
                        <div className="flex items-center gap-2 text-sm" aria-live="polite">
                            <span className={cn("font-semibold transition-colors", step === "branch" ? "text-primary" : "text-gray-500")}>Branch</span>
                            <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />
                            <span className={cn("font-semibold transition-colors", step === "semester" ? "text-primary" : "text-gray-500")}>Semester</span>
                        </div>
                        {step === "semester" && (
                            <button
                                type="button"
                                onClick={() => setBranch(null)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-2"
                            >
                                Change branch
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-4 sm:p-6 min-h-[240px] rounded-3xl border border-gray-800 flex flex-col justify-center bg-white/10">
                        <AnimatePresence mode="wait">
                            {step === "branch" && (
                                <motion.div
                                    key="branch"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-4">
                                        {branches.map((branch) => (
                                            <button
                                                type="button"
                                                key={`${branch.courseSlug}/${branch.slug}`}
                                                onClick={() => setBranch(branch.slug)}
                                                className="group border border-gray-800 flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                            >
                                                <span className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{branch.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        More branches will be added. Need one? <a href="#contact" className="underline hover:text-gray-900">Let us know</a>.
                                    </p>
                                </motion.div>
                            )}
                            {step === "semester" && selected && (
                                <motion.div
                                    key="semester"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                                >
                                    {selected.semesters.map((sem, i) => (
                                        <Link
                                            key={sem.slug}
                                            href={dashboardHref([selected.courseSlug, selected.slug, sem.slug])}
                                            className="group border border-gray-800 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-white hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                                        >
                                            <span className="text-3xl font-black text-gray-300 group-hover:text-gray-500 mb-2 transition-colors">{i + 1}</span>
                                            <span className="font-bold text-gray-900 group-hover:text-gray-800 transition-colors">Semester</span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                {sem.subjects.length ? `${sem.subjects.length} subject${sem.subjects.length === 1 ? "" : "s"}` : "Coming soon"}
                                            </span>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
