import Link from "next/link";
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
  blue: "text-[#345443] bg-[#eef2e9]",
  green: "text-[#345443] bg-[#eef2e9]",
  purple: "text-[#5c5067] bg-[#f0edf2]",
  orange: "text-[#775d2a] bg-[#f6efdf]",
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
    <article className="group relative rounded-lg border border-border bg-white p-6 transition-colors hover:border-primary focus-within:ring-2 focus-within:ring-ring">
      <div>
        <div className="mb-4">
          <span
            className={cn(
              "inline-block rounded px-2 py-1 text-xs font-medium",
              colorStyles[color],
            )}
          >
            {tag}
          </span>
        </div>

        <Heading className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
          {/* One link per card; the pseudo-element stretches it over the whole card. */}
          <Link
            href={href}
            scroll={scroll}
            className="focus:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {title}
          </Link>
        </Heading>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs">
          <span className="text-muted-foreground">{meta}</span>
          <span
            aria-hidden="true"
            className="flex items-center gap-1 font-medium text-primary"
          >
            Open <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}
