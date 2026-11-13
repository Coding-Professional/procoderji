"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight, GraduationCap, LayoutDashboard, Sparkles } from "lucide-react";
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

function BranchSelector() {
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
                            className="min-h-11 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors px-2 py-2"
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
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    {branches.map((branch) => (
                                        <button
                                            type="button"
                                            key={`${branch.courseSlug}/${branch.slug}`}
                                            onClick={() => setBranch(branch.slug)}
                                            className="group flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-white p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6"
                                        >
                                            <GraduationCap aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
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
                                        className="group border border-gray-800 flex min-w-0 flex-col items-center justify-center p-3 sm:p-6 rounded-2xl bg-white hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
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
    );
}

/** Crawlable, no-JS version of the branch picker shown while the interactive one loads. */
function SelectorFallback() {
    return (
        <div className="mt-10 sm:mt-16 w-full max-w-3xl relative z-10 rounded-3xl border border-gray-800 bg-white/80 p-6 min-h-[240px]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {branches.map((branch) => (
                    <Link
                        key={`${branch.courseSlug}/${branch.slug}`}
                        href={`/?branch=${encodeURIComponent(branch.slug)}`}
                        className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-white p-4 font-semibold text-gray-900 sm:p-6"
                    >
                        <GraduationCap aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
                        {branch.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function Hero() {
    return (
        <section data-home-hero className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20 lg:py-24 text-center relative overflow-hidden">
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
                    <span>Free learning. Focused placement practice.</span>
                </div>

                <h1 className="text-[clamp(2.125rem,8vw,3.75rem)] lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1] break-words">
                    Build skills for <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-amber-500 to-gray-900">
                        your next opportunity
                    </span>
                </h1>

                <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    Practise aptitude, reasoning, verbal ability, and programming with clear explanations.
                    Save your progress, find your next topic, and build a study routine at your own pace.
                </p>
                <div className="mx-auto flex max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap">
                    <Link href="/practice" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-bold text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900">Start placement practice<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>
                    <Link href="/learn" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900"><LayoutDashboard aria-hidden="true" className="h-4 w-4 shrink-0" />My learning workspace</Link>
                </div>
            </motion.div>

            <Suspense fallback={<SelectorFallback />}>
                <BranchSelector />
            </Suspense>
        </section>
    );
}
