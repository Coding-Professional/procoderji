import React from "react";
import { parseBlocks, type Inline } from "@/lib/markdown";

function renderInline(nodes: Inline[]): React.ReactNode {
	return nodes.map((n, i) => {
		switch (n.type) {
			case "text":
				return <React.Fragment key={i}>{n.value}</React.Fragment>;
			case "code":
				return <code key={i}>{n.value}</code>;
			case "strong":
				return <strong key={i}>{renderInline(n.children)}</strong>;
			case "em":
				return <em key={i}>{renderInline(n.children)}</em>;
			case "link": {
				const external = /^https?:/i.test(n.href);
				return (
					<a
						key={i}
						href={n.href}
						{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
					>
						{renderInline(n.children)}
					</a>
				);
			}
		}
	});
}

/**
 * Small markdown renderer for notes. Builds React elements from a parsed
 * structure (no dangerouslySetInnerHTML), and only emits links with an
 * allow-listed URL scheme. It does not evaluate MDX/JSX/JS.
 */
export default function MDXRenderer({ mdx }: { mdx: string }) {
	const blocks = parseBlocks(mdx);

	return (
		<div>
			{blocks.map((b, i) => {
				switch (b.type) {
					case "heading": {
						const Tag = `h${b.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
						return (
							<Tag key={i} id={b.id}>
								{b.text}
							</Tag>
						);
					}
					case "code":
						return (
							<pre key={i}>
								<code data-lang={b.lang}>{b.text}</code>
							</pre>
						);
					case "hr":
						return <hr key={i} />;
					case "list": {
						const List = b.ordered ? "ol" : "ul";
						return (
							<List key={i}>
								{b.items.map((item, j) => (
									<li key={j}>{renderInline(item)}</li>
								))}
							</List>
						);
					}
					case "paragraph":
						return <p key={i}>{renderInline(b.children)}</p>;
				}
			})}
		</div>
	);
}
