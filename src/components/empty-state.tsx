import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

interface EmptyStateProps {
    title: string;
    description?: string;
    backHref?: string;
    backLabel?: string;
}

/** Shown wherever the catalogue has no published notes yet. */
export function EmptyState({
    title,
    description = "We are still preparing these notes. Check back soon, or tell us what you need.",
    backHref,
    backLabel = "Go back",
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center text-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-14">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <BookOpenCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold mb-2">{title}</h2>
            <p className="text-muted-foreground max-w-md mb-6">{description}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                {backHref && (
                    <Link
                        href={backHref}
                        className="px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-accent transition-colors"
                    >
                        {backLabel}
                    </Link>
                )}
                <a
                    href="mailto:procoderji@gmail.com?subject=Notes%20request"
                    className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                    Request notes by email
                </a>
            </div>
        </div>
    );
}
