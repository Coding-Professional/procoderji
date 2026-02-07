"use client";

import React from "react";
import { motion } from "framer-motion";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export function About() {
    return (
        <section id="about" className="py-24 px-6 bg-white/80 relative">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="space-y-6"
                >
                    <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        About Us
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight">
                        Study Smart with <span className="text-primary">ProCoderJii</span>
                    </h2>
                    <div className="text-lg text-gray-600 leading-relaxed space-y-4">
                        <p>
                            ProCoderJii Notes is a student-first learning platform connected with the ProCoderJii YouTube channel. We organize notes, PYQs, practical files, and exam material so you can revise faster and study with clarity.
                        </p>
                        <p>
                            Every resource is designed for quick access. You can open or download material in one click, follow video explanations, and prepare unit by unit without wasting time searching in multiple groups or drives.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2">
                            <h4 className="text-3xl font-bold text-gray-900">3k+</h4>
                            <p className="text-gray-500 text-sm">YouTube Learners</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-3xl font-bold text-gray-900">500+</h4>
                            <p className="text-gray-500 text-sm">Notes & Study Files</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative"
                >

                    <DotLottieReact
                        src="https://lottie.host/03f3455e-6058-4e40-ae27-c67a4877a891/g3qhusH5w3.lottie"
                        loop
                        autoplay
                    />
                </motion.div>
            </div>
        </section>
    );
}
