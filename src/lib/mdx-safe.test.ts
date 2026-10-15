import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serialize } from "next-mdx-remote/serialize";
import { remarkRejectJsx, SAFE_MDX_OPTIONS, UnsafeNoteContentError } from "./mdx-safe.ts";

const compile = async (source: string) => (await serialize(source, SAFE_MDX_OPTIONS)).compiledSource;

test("the plugin throws for JSX, expression and ESM nodes at any depth, naming the line", () => {
	for (const type of ["mdxJsxFlowElement", "mdxJsxTextElement", "mdxFlowExpression", "mdxTextExpression", "mdxjsEsm", "html"]) {
		const tree = { type: "root", children: [{ type: "paragraph", children: [{ type: "text" }, { type, position: { start: { line: 7 } } }] }] };
		assert.throws(() => remarkRejectJsx()(tree), (e: unknown) => e instanceof UnsafeNoteContentError && /line 7/.test((e as Error).message));
	}
});

test("the plugin leaves ordinary Markdown nodes alone", () => {
	const tree = { type: "root", children: [{ type: "heading", children: [{ type: "text" }] }, { type: "paragraph", children: [{ type: "text" }, { type: "strong" }] }, { type: "code" }] };
	assert.doesNotThrow(() => remarkRejectJsx()(tree));
});

test("hostile or unsafe note content is rejected by the real compiler, never emitted", async () => {
	const hostile: Record<string, string> = {
		"script tag": "Hello\n\n<script>window.__pwned = 1</script>\n",
		"iframe": '<iframe src="https://evil.example"></iframe>',
		"inline element with handler": 'Inline <img src="x" onerror="alert(1)" /> too.',
		"component with expression handler": "<div onClick={() => alert(1)}>x</div>",
		"import": "import Evil from 'evil'\n\nText",
		"expression reading env": "Value {process.env.SECRET}.",
		"block expression": "{globalThis.fetch('https://evil.example')}",
		"export": "export const x = 1\n\nText",
	};
	for (const [name, src] of Object.entries(hostile)) {
		await assert.rejects(() => compile(src), `${name} should be rejected`);
	}
});

test("rejections explain how to fix the content", async () => {
	await assert.rejects(() => compile("A set {1, 2, 3} here."), (e: unknown) => {
		const m = (e as Error).message;
		return /only contain Markdown/.test(m) && /curly-brace expression/.test(m) && /line 1/.test(m) && /backticks/.test(m);
	});
	await assert.rejects(() => compile("A List<int> here."), /Markdown|closing tag|Expected/);
});

test("text is never silently dropped: braces and angle brackets survive when written safely", async () => {
	const safe: Record<string, string> = {
		"backticked braces": "Use `{a, b}` here.",
		"backticked generics": "Use `List<int>` here.",
		"escaped braces": String.raw`The set \{1, 2, 3\} is small.`,
		"entities": "A List&lt;int&gt; here.",
		"dollar signs": "Cost is $5 and $x^2$.",
	};
	for (const [name, src] of Object.entries(safe)) {
		const out = await compile(src);
		const needle = { "backticked braces": "{a, b}", "backticked generics": "List<int>", "escaped braces": "{1, 2, 3}", "entities": "List<int>", "dollar signs": "$x^2$" }[name]!;
		assert.ok(out.includes(needle), `${name}: expected output to contain ${needle}`);
	}
});

test("ordinary Markdown compiles", async () => {
	const out = await compile("# Heading\n\n- one\n- two\n\n```js\nconst a = { b: 1 };\n```\n\n[link](https://example.org)\n");
	assert.ok(out.includes("Heading"));
	assert.ok(out.includes("const a = { b: 1 };"));
});

test("every .mdx file under src/content compiles with the safe options", async () => {
	const files: string[] = [];
	const walk = (dir: string) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, e.name);
			if (e.isDirectory()) walk(full);
			else if (e.name.endsWith(".mdx")) files.push(full);
		}
	};
	walk(path.resolve("src/content"));
	for (const f of files) {
		await assert.doesNotReject(() => compile(fs.readFileSync(f, "utf8")), `${path.relative(".", f)} must be valid Markdown-only MDX`);
	}
});
