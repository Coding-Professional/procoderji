import React from "react";
import { extractHeadings } from "@/lib/markdown";

export default function TOC({ mdx }: { mdx: string }) {
	const items = extractHeadings(mdx);

	if (items.length === 0) return <div className="text-sm text-gray-500">No headings</div>;

	return (
		<nav aria-label="Table of contents">
			<ul className="space-y-1">
				{items.map((it) => (
					<li key={it.id} style={{ paddingLeft: `${(Math.min(6, it.level) - 1) * 0.75}rem` }}>
						<a href={`#${it.id}`} className="text-sm text-gray-700 hover:underline">
							{it.text}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
