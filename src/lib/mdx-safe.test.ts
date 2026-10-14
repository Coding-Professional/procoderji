import { test } from "node:test";
import assert from "node:assert/strict";
import { serialize } from "next-mdx-remote/serialize";
import { remarkStripJsx, SAFE_MDX_OPTIONS } from "./mdx-safe.ts";

const compile = async (source: string) => (await serialize(source, SAFE_MDX_OPTIONS)).compiledSource;

test("the plugin removes JSX, expression and ESM nodes at any depth and keeps Markdown nodes", () => {
	const tree = {
		type: "root",
		children: [
			{ type: "heading", children: [{ type: "text" }] },
			{ type: "mdxJsxFlowElement", children: [{ type: "text" }] },
			{ type: "paragraph", children: [{ type: "text" }, { type: "mdxJsxTextElement" }, { type: "mdxTextExpression" }] },
			{ type: "mdxjsEsm" },
			{ type: "mdxFlowExpression" },
			{ type: "html" },
		],
	};
	remarkStripJsx()(tree);
	assert.deepEqual(
		tree.children.map((c) => c.type),
		["heading", "paragraph"]
	);
	assert.deepEqual(tree.children[1].children?.map((c) => c.type), ["text"]);
});

test("compiled notes contain no script, iframe or other raw-element output", async () => {
	const out = await compile(
		[
			"# Title",
			"",
			"Safe **markdown** stays.",
			"",
			'<script>window.__pwned = 1</script>',
			'<iframe src="https://evil.example"></iframe>',
			'<div onClick={() => alert(1)}>x</div>',
			"",
			'Inline <img src="x" onerror="alert(1)" /> too.',
			"",
			"import Evil from 'evil'",
			"",
			"Expression {1 + 1} and {process.env.SECRET}.",
		].join("\n")
	);
	for (const bad of ["script", "iframe", "__pwned", "evil", "onerror", "onClick", "alert", "process.env", "SECRET"]) {
		assert.ok(!out.includes(bad), `compiled output should not contain "${bad}"`);
	}
	assert.ok(out.includes("Safe"));
	assert.ok(out.includes("Title"));
});

test("ordinary Markdown still compiles", async () => {
	const out = await compile("## Heading\n\n- one\n- two\n\n```js\nconst a = 1;\n```\n");
	assert.ok(out.includes("Heading"));
	assert.ok(out.includes("const a = 1;"));
});

test("malformed JSX fails closed instead of producing output", async () => {
	await assert.rejects(() => compile("Inline <img src=x onerror=alert(1) /> too."));
	await assert.rejects(() => compile("<script>unclosed"));
});
