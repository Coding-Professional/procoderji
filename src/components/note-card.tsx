"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteCardProps {
    title: string;
    description: string;
    href: string;
    /** Optional secondary line, e.g. "3 subjects" or "Coming soon". */
    meta?: string;
    tag?: string;
    color?: "blue" | "green" | "purple" | "orange";
    scroll?: boolean;
    /** Heading level of the card title; use 2 when the page has no section heading above the cards. */
    headingLevel?: 2 | 3;
}

const colorStyles = {
    blue: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-500/10",
    green: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 bg-green-500/10",
    purple: "text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-500/10",
    orange: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 bg-orange-500/10",
};

export function NoteCard({
    title,
    description,
    href,
    meta,
    tag = "Note",
    color = "blue",
    scroll = true,
    headingLevel = 3,
}: NoteCardProps) {
    const Heading = headingLevel === 2 ? "h2" : "h3";
    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="group relative glass-card rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:border-primary/50 overflow-hidden focus-within:ring-2 focus-within:ring-ring"
        >
            {/* Gradient Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative z-10">
                <div className="mb-4">
                    <span className={cn("inline-block px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md", colorStyles[color])}>
                        {tag}
                    </span>
                </div>

                <Heading className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {/* One link per card; the pseudo-element stretches it over the whole card. */}
                    <Link href={href} scroll={scroll} className="focus:outline-none after:absolute after:inset-0 after:content-['']">
                        {title}
                    </Link>
                </Heading>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs">
                    <span className="text-muted-foreground">{meta}</span>
                    <span
                        aria-hidden="true"
                        className="flex items-center gap-1 font-medium text-primary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300"
                    >
                        Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
