"use client";

import React from "react";
import Link from "next/link";
import { Mail, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { ContactForm } from "./contact-form";

export function Contact() {
    return (
        <section id="contact" className="px-4 py-16 sm:px-6 sm:py-24 bg-gray-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 lg:gap-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="space-y-10"
                    >
                        <div className="space-y-4">
                            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                                Contact <br />
                                <span className="text-primary">ProCoderJii Team</span>
                            </h2>
                            <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                                For note requests, collaboration, or study material queries, leave a message for our team.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 shrink-0">
                                    <Mail aria-hidden="true" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500 mb-0.5">Email</div>
                                    <a className="inline-flex min-h-11 items-center break-all text-base font-semibold text-gray-900 sm:text-lg" href="mailto:procoderji@gmail.com">
                                        procoderji@gmail.com
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 shrink-0">
                                    <Globe aria-hidden="true" className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-500 mb-0.5">Website</div>
                                    <Link className="inline-flex min-h-11 items-center text-lg font-semibold text-gray-900" href="/">
                                        procoderji.com
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="min-w-0 bg-gray-50 rounded-3xl p-4 sm:p-8 lg:p-10"
                    >
                        <ContactForm />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
