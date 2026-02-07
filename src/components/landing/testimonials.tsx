"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        name: "Aman Verma",
        role: "CSE, 3rd Year",
        content:
            "I watched ProCoderJii videos and revised from these notes. Preparation became faster and much more structured.",
    },
    {
        name: "Sakshi Jain",
        role: "AIML, 2nd Year",
        content:
            "The unit-wise notes and PYQ focus saved me before internals. I knew exactly what to revise.",
    },
    {
        name: "Rohit Sen",
        role: "IT, Final Year",
        content:
            "Best part is the practical approach. Video explanation plus downloadable material works really well.",
    },
    {
        name: "Neha Gupta",
        role: "ECE, 1st Year",
        content:
            "As a beginner, I found everything in one place without confusion. Clean layout and useful study files.",
    },
    {
        name: "Deepak Sharma",
        role: "Mechanical, 4th Year",
        content:
            "I used the important questions section for last-week prep and it helped a lot in final exams.",
    },
    {
        name: "Priya Singh",
        role: "Civil, 2nd Year",
        content:
            "The platform feels made by students for students. Easy access, fast downloads, and practical content.",
    },
];

export function Testimonials() {
    return (
        <section id="testimonials" className="py-24 px-6 bg-white/80 ">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
                        Student Feedback
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Real outcomes from students using ProCoderJii notes and study material.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 ">
                    {testimonials.map((t, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", stiffness: 120 }}
                            className="relative p-[2px] border border-gray-800 rounded-3xl shadow-xl"
                        >
                            <div className="rounded-3xl bg-white p-8 h-full">
                                <div className="flex items-center gap-1 mb-4 text-yellow-500">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-5 h-5 fill-current" />
                                    ))}
                                </div>

                                <p className="text-gray-700 mb-6 leading-relaxed italic">
                                    &quot;{t.content}&quot;
                                </p>

                                <div className="flex items-center gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{t.name}</h4>
                                        <p className="text-xs text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
