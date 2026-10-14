// Safe MDX compilation settings for notes.
//
// Notes are written as plain Markdown. MDX also allows raw JSX/HTML elements
// (<script>, <iframe>, ...), {JavaScript expressions} and import/export lines.
// next-mdx-remote's blockJS only removes expressions, and element overrides do
// not apply to raw JSX tags, so a note could still ship a live <script>. This
// remark plugin removes every JSX element, expression and ESM node before the
// note is compiled, so only Markdown content can reach the page.

interface MdastNode {
	type: string;
	children?: MdastNode[];
}

const BLOCKED_NODE_TYPES = new Set([
	"mdxJsxFlowElement",
	"mdxJsxTextElement",
	"mdxFlowExpression",
	"mdxTextExpression",
	"mdxjsEsm",
	// Raw HTML nodes (not produced by MDX, but removed in case another parser is used).
	"html",
]);

function strip(node: MdastNode): void {
	if (!node.children) return;
	node.children = node.children.filter((child) => !BLOCKED_NODE_TYPES.has(child.type));
	for (const child of node.children) strip(child);
}

/** remark plugin: drop raw JSX/HTML, JS expressions and import/export from the document. */
export function remarkStripJsx() {
	return (tree: MdastNode) => strip(tree);
}

/** Options for MDXRemote / serialize for trusted-but-reviewed notes. */
export const SAFE_MDX_OPTIONS = {
	blockJS: true,
	blockDangerousJS: true,
	mdxOptions: { remarkPlugins: [remarkStripJsx] },
};
