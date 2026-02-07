"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
    {
        question: "Are the notes and study files free?",
        answer:
            "Yes. Core notes, PYQs, and most study resources are freely available for students.",
    },
    {
        question: "Is this connected to the ProCoderJii YouTube channel?",
        answer:
            "Yes. This platform is built to complement ProCoderJii YouTube content with downloadable notes and revision files.",
    },
    {
        question: "Can I download PDFs and keep them offline?",
        answer:
            "Yes. You can open resources online and also download materials for offline study.",
    },
    {
        question: "How is content organized?",
        answer:
            "Content is arranged by branch, semester, subject, and unit so students can find the right material quickly.",
    },
    {
        question: "Do you upload previous year questions?",
        answer:
            "Yes. PYQ collections are added subject-wise to support exam-focused preparation.",
    },
    {
        question: "How can I request missing notes?",
        answer:
            "You can contact us through email and share your subject details. We prioritize requests based on student demand.",
    },
    {
        question: "Can I contribute my own notes?",
        answer:
            "Yes. High-quality student notes can be reviewed and added to help the wider community.",
    },
    {
        question: "Where can I contact the team?",
        answer:
            "Use the contact section or email us directly at procoderji@gmail.com.",
    },
];

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative group rounded-2xl p-[2px] border border-gray-800 mb-4"
        >
            <div className="rounded-2xl bg-white px-6 py-5 shadow-sm transition-all duration-300 ">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-left"
                >
                    <span className="text-lg font-semibold text-gray-900 flex-1">{question}</span>
                    <ChevronDown
                        className={cn(
                            "w-5 h-5 text-gray-400 transition-transform duration-300",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <p className="text-gray-600 mt-4 pb-2 leading-relaxed">{answer}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export function FAQ() {
    return (
        <section id="faq" className="py-24 px-6 bg-white/80">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Common questions about ProCoderJii notes and study material.
                    </p>
                </motion.div>

                <div>
                    {faqs.map((faq, index) => (
                        <FaqItem key={index} {...faq} />
                    ))}
                </div>
            </div>
        </section>
    );
}
