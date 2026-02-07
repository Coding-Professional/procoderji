"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Globe, Mail } from "lucide-react";
import { motion } from "framer-motion";

export function Footer() {
    return (
        <footer className="py-8 px-4 sm:px-6 bg-white overflow-hidden">
            <div className="max-w-8xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative rounded-[2.5rem] border border-gray-800 overflow-hidden p-8 md:p-12 lg:p-16 "
                >
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-yellow-300/40 rounded-full blur-[120px] animate-pulse" />
                        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-amber-400/30 rounded-full blur-[120px] animate-pulse delay-1000" />
                    </div>

                    <div
                        className="absolute inset-0 opacity-[0.1]"
                        style={{
                            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
                            backgroundSize: "32px 32px",
                        }}
                    />

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                        <div className="space-y-8">
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight"
                            >
                                STUDY BETTER WITH <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-gray-900">
                                    PROCODERJII NOTES
                                </span>
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <Link
                                    href="/dashboard"
                                    className="px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg"
                                >
                                    Browse Notes
                                </Link>
                                <a
                                    href="mailto:procoderji@gmail.com"
                                    className="px-8 py-4 bg-white/80 border border-gray-200 text-gray-900 font-semibold rounded-xl hover:bg-white transition-all flex items-center gap-2 group"
                                >
                                    <Mail className="w-5 h-5" />
                                    <span>Contact</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                            </motion.div>
                        </div>

                        <div className="flex flex-col justify-between gap-12">
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="grid grid-cols-2 gap-12 lg:pl-20"
                            >
                                <div>
                                    <h4 className="font-bold mb-6 uppercase tracking-wider text-sm">Platform</h4>
                                    <ul className="space-y-4 text-sm font-medium">
                                        <li>
                                            <Link href="/dashboard" className="hover:text-gray-500 transition-colors">
                                                Browse Notes
                                            </Link>
                                        </li>
                                        <li>
                                            <Link href="/dashboard" className="hover:text-gray-500 transition-colors">
                                                Question Papers
                                            </Link>
                                        </li>
                                        <li>
                                            <a href="#faq" className="hover:text-gray-500 transition-colors">
                                                FAQs
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold mb-6 uppercase tracking-wider text-sm">Connect</h4>
                                    <ul className="space-y-4 text-sm font-medium ">
                                        <li>
                                            <a href="mailto:procoderji@gmail.com" className="hover:text-gray-500 transition-colors">
                                                Email
                                            </a>
                                        </li>
                                        <li>
                                            <Link href="https://procoderji.xyz" target="_blank" className="hover:text-gray-500 transition-colors">
                                                Website
                                            </Link>
                                        </li>
                                        <li>
                                            <a href="#contact" className="hover:text-gray-500 transition-colors">
                                                Contact Section
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="relative z-10 md:mt-2 mt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
                        <p>Copyright {new Date().getFullYear()} ProCoderJii. All rights reserved.</p>
                        <Link target="_blank" href="https://procoderji.xyz" className="hover:text-gray-700 transition-colors p-2 hover:bg-white/50 rounded-full">
                            <Globe className="w-4 h-4" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </footer>
    );
}
