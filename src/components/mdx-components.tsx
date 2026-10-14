import { createElement } from "react";
import type { MDXComponents } from "mdx/types";
import { sanitizeUrl } from "@/lib/markdown";
import { demoteHeading } from "@/lib/headings";

function Heading({ level, ...props }: { level: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<"h2">) {
    return createElement(demoteHeading(level), props);
}

/**
 * Element styles for rendered notes. Raw HTML/JSX is removed before compilation
 * (see lib/mdx-safe.ts). Links and images go through the same URL allow-list as
 * the custom markdown renderer: javascript:, data: and similar destinations are
 * rendered as plain text / omitted.
 */
export const mdxComponents: MDXComponents = {
    // The page supplies the only <h1> (the note title); see lib/headings.ts.
    h1: (props) => <Heading level={1} className="text-3xl font-bold mt-8 mb-4" {...props} />,
    h2: (props) => <Heading level={2} className="text-2xl font-semibold mt-8 mb-3" {...props} />,
    h3: (props) => <Heading level={3} className="text-xl font-semibold mt-6 mb-2" {...props} />,
    h4: (props) => <Heading level={4} className="text-lg font-semibold mt-5 mb-2" {...props} />,
    h5: (props) => <Heading level={5} className="font-semibold mt-4 mb-2" {...props} />,
    h6: (props) => <Heading level={6} className="text-sm font-semibold mt-4 mb-2" {...props} />,
    p: (props) => <p className="leading-7 mb-4" {...props} />,
    ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
    ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
    li: (props) => <li className="leading-7" {...props} />,
    blockquote: (props) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4" {...props} />,
    hr: (props) => <hr className="my-8 border-gray-200" {...props} />,
    pre: (props) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm" {...props} />,
    code: (props) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
    img: ({ src, alt }) => {
        const safe = typeof src === "string" ? sanitizeUrl(src) : null;
        // eslint-disable-next-line @next/next/no-img-element
        return safe ? <img src={safe} alt={alt ?? ""} loading="lazy" className="max-w-full h-auto rounded-lg my-4" /> : null;
    },
    a: ({ href, children, ...rest }) => {
        const safe = typeof href === "string" ? sanitizeUrl(href) : null;
        if (!safe) return <span>{children}</span>;
        const external = /^https?:/i.test(safe);
        return (
            <a
                {...rest}
                href={safe}
                className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
                {children}
            </a>
        );
    },
};
