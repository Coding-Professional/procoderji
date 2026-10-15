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
                            ProCoderJii Notes is a student-first learning site that goes with the ProCoderJii YouTube channel. We are building a library of unit-wise notes for engineering students, organised by branch, semester and subject, so you can revise faster and study with clarity.
                        </p>
                        <p>
                            Notes are written and reviewed by the ProCoderJii team before they are published. Where official university syllabi or question papers exist, we link to the official source instead of copying it.
                        </p>
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
