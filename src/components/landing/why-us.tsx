"use client";

import React from "react";
import { motion } from "framer-motion";
import { Youtube, User, BookOpenCheck, type LucideIcon } from "lucide-react";

const FeatureCard = ({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) => (
    <motion.div className="relative p-[2px] rounded-3xl border border-gray-800 shadow-xl transition-all duration-300">
        <div className="rounded-3xl bg-white/90 backdrop-blur-xl p-8 h-full">
            <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1 }}
                className="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center text-primary mb-5 shadow-inner"
            >
                <Icon className="w-7 h-7 text-amber-700" />
            </motion.div>

            <h3 className="text-xl font-extrabold mb-3 text-gray-900 tracking-tight">{title}</h3>

            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
    </motion.div>
);

export function WhyUs() {
    return (
        <section className="relative py-28 px-6 bg-white/80 overflow-hidden">
            <motion.div
                animate={{ y: [0, -30, 0] }}
                transition={{ repeat: Infinity, duration: 10 }}
                className="absolute top-10 left-16 w-40 h-40 rounded-full blur-3xl"
            />
            <motion.div
                animate={{ y: [0, 40, 0] }}
                transition={{ repeat: Infinity, duration: 12 }}
                className="absolute bottom-10 right-20 w-52 h-52 rounded-full blur-3xl"
            />

            <div className="max-w-7xl mx-auto relative">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-5">
                        Why Learn with ProCoderJii?
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        More than files. A practical, exam-ready system built from classroom and YouTube learning patterns.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <FeatureCard
                        icon={Youtube}
                        title="YouTube + Notes"
                        description="Watch concept videos on ProCoderJii and revise the same topic here with clean, unit-wise notes."
                    />

                    <FeatureCard
                        icon={User}
                        title="Student Focused"
                        description="Resources are arranged by branch, semester, and subject so students can find the right file in seconds."
                    />

                    <FeatureCard
                        icon={BookOpenCheck}
                        title="Exam Ready Content"
                        description="Get notes, PYQs, and important question sets curated for actual university exams and last-week revision."
                    />
                </div>
            </div>
        </section>
    );
}
