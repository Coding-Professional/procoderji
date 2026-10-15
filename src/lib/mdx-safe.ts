// Safe MDX compilation settings for notes and guides.
//
// Notes are plain Markdown. MDX also allows raw JSX/HTML elements (<script>,
// <iframe>, ...), {JavaScript expressions} and import/export lines. These are
// REJECTED, not silently removed: next-mdx-remote's blockJS only deletes
// {expressions} (so text such as "{1, 2, 3}" would vanish without a trace) and
// element overrides do not apply to raw JSX tags (so a note could still ship a
// live <script>). Failing the build with a clear message keeps hostile content
// out and makes sure authors notice instead of losing text.

interface MdastNode {
	type: string;
	children?: MdastNode[];
	position?: { start?: { line?: number; column?: number } };
}

const BLOCKED: Record<string, string> = {
	mdxJsxFlowElement: "a raw HTML/JSX tag",
	mdxJsxTextElement: "a raw HTML/JSX tag",
	mdxFlowExpression: "a {curly-brace expression}",
	mdxTextExpression: "a {curly-brace expression}",
	mdxjsEsm: "an import/export line",
	// Raw HTML nodes (not produced by MDX, but rejected in case another parser is used).
	html: "raw HTML",
};

export class UnsafeNoteContentError extends Error {
	constructor(what: string, line?: number) {
		super(
			`Notes may only contain Markdown: found ${what}${line ? ` on line ${line}` : ""}. ` +
				"Put code or symbols such as <T> or {a, b} in `backticks`, or escape them: write &lt; for < and \\{ \\} for braces."
		);
		this.name = "UnsafeNoteContentError";
	}
}

function check(node: MdastNode): void {
	for (const child of node.children ?? []) {
		const what = BLOCKED[child.type];
		if (what) throw new UnsafeNoteContentError(what, child.position?.start?.line);
		check(child);
	}
}

/** remark plugin: throw if the document contains raw JSX/HTML, JS expressions or import/export. */
export function remarkRejectJsx() {
	return (tree: MdastNode) => check(tree);
}

/**
 * Options for MDXRemote / serialize. blockJS is off on purpose: the plugin above rejects
 * every expression with a clear error, whereas blockJS would delete them silently.
 * blockDangerousJS stays on as a second line of defence.
 */
export const SAFE_MDX_OPTIONS = {
	blockJS: false,
	blockDangerousJS: true,
	mdxOptions: { remarkPlugins: [remarkRejectJsx] },
};
