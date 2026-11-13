"use client";

import { MotionConfig } from "framer-motion";

/** Respect the visitor's "reduce motion" operating-system setting for every animation. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
