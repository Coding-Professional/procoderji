import type { MDXComponents } from "mdx/types";
import { sanitizeUrl } from "@/lib/markdown";

/**
 * Element styles for rendered notes. Raw HTML/JSX is removed before compilation
 * (see lib/mdx-safe.ts). Links and images go through the same URL allow-list as
 * the custom markdown renderer: javascript:, data: and similar destinations are
 * rendered as plain text / omitted.
 */
export const mdxComponents: MDXComponents = {
    h1: (props) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-8 mb-3" {...props} />,
    h3: (props) => <h3 className="text-xl font-semibold mt-6 mb-2" {...props} />,
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
