import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx-components";
import { SAFE_MDX_OPTIONS } from "@/lib/mdx-safe";

/** A note or guide rendered from Markdown: raw HTML/JSX and expressions are removed first. */
export function NoteBody({ source }: { source: string }) {
    return (
        // overflow-wrap:anywhere keeps long URLs and unbroken words inside the card on small screens.
        <div className="min-w-0 rounded-2xl border border-border bg-white/90 p-6 sm:p-10 [overflow-wrap:anywhere]">
            <MDXRemote source={source} components={mdxComponents} options={SAFE_MDX_OPTIONS} />
        </div>
    );
}
