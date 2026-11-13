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
    <div className="flex flex-col items-center rounded-lg border border-dashed border-input bg-white px-6 py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <BookOpenCheck className="w-6 h-6" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {backHref && (
          <Link href={backHref} className="pcj-button pcj-button-secondary">
            {backLabel}
          </Link>
        )}
        <a
          href="mailto:procoderji@gmail.com?subject=Notes%20request"
          className="pcj-button pcj-button-primary"
        >
          Request notes by email
        </a>
      </div>
    </div>
  );
}
