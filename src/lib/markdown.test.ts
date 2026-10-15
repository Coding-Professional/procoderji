import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeUrl, sanitizeImageUrl, parseInline, parseBlocks, extractHeadings } from "./markdown.ts";

test("sanitizeUrl allows http, https, mailto and relative URLs", () => {
	assert.equal(sanitizeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
	assert.equal(sanitizeUrl("http://example.com"), "http://example.com");
	assert.equal(sanitizeUrl("mailto:a@b.co"), "mailto:a@b.co");
	assert.equal(sanitizeUrl("/dashboard/btech"), "/dashboard/btech");
	assert.equal(sanitizeUrl("../unit-2"), "../unit-2");
	assert.equal(sanitizeUrl("#intro"), "#intro");
	assert.equal(sanitizeUrl("notes/a:b"), "notes/a:b");
});

test("sanitizeUrl rejects dangerous or ambiguous URLs", () => {
	for (const bad of [
		"javascript:alert(1)",
		"JaVaScRiPt:alert(1)",
		"  javascript:alert(1)",
		"java\tscript:alert(1)",
		"java\nscript:alert(1)",
		"javascript:alert(1)",
		"data:text/html;base64,PHNjcmlwdD4=",
		"vbscript:msgbox(1)",
		"file:///etc/passwd",
		"//evil.example/x",
		"\\\\evil.example\\x",
		"\u0001javascript:alert(1)",
		"",
		"   ",
	]) {
		assert.equal(sanitizeUrl(bad), null, JSON.stringify(bad));
	}
});

test("links with unsafe URLs degrade to plain text", () => {
	const nodes = parseInline("[click](javascript:alert(1))");
	assert.deepEqual(nodes, [{ type: "text", value: "click" }]);
});

test("safe links are parsed and a title is ignored", () => {
	const nodes = parseInline('[docs](https://example.com "Title")');
	assert.deepEqual(nodes, [
		{ type: "link", href: "https://example.com", children: [{ type: "text", value: "docs" }] },
	]);
});

test("attribute-breaking URLs stay data, never markup", () => {
	const [node] = parseInline('[x](https://a.test/" onmouseover="alert(1))');
	// The parser output is a plain value; React escapes attributes when rendering.
	assert.equal(node.type, "link");
});

test("HTML in text is kept as literal text", () => {
	assert.deepEqual(parseInline("<script>alert(1)</script>"), [
		{ type: "text", value: "<script>alert(1)</script>" },
	]);
});

test("inline code, bold and italic", () => {
	assert.deepEqual(parseInline("a `b` **c** *d*").map((n) => n.type), [
		"text", "code", "text", "strong", "text", "em",
	]);
});

test("code fences are preserved verbatim and headings inside them ignored", () => {
	const src = "# Title\n```js\n# not a heading\n<b>x</b>\n```\n";
	const blocks = parseBlocks(src);
	assert.equal(blocks[1].type, "code");
	assert.deepEqual(extractHeadings(src).map((h) => h.text), ["Title"]);
});

test("duplicate headings get unique ids", () => {
	const ids = extractHeadings("## Intro\n## Intro\n## Intro").map((h) => h.id);
	assert.deepEqual(ids, ["intro", "intro-1", "intro-2"]);
});

test("lists and paragraphs", () => {
	const blocks = parseBlocks("- a\n- b\n\n1. x\n2. y\n\nline one\nline two");
	assert.deepEqual(blocks.map((b) => b.type), ["list", "list", "paragraph"]);
	assert.equal((blocks[0] as { ordered: boolean }).ordered, false);
	assert.equal((blocks[1] as { ordered: boolean }).ordered, true);
});

test("sanitizeImageUrl allows only same-site absolute paths", () => {
	assert.equal(sanitizeImageUrl("/images/diagram.png"), "/images/diagram.png");
	for (const bad of [
		"https://tracker.example/pixel.gif",
		"http://example.com/a.png",
		"//evil.example/a.png",
		"data:image/svg+xml;base64,PHN2Zz4=",
		"javascript:alert(1)",
		"images/relative.png",
		"./relative.png",
		"",
	]) {
		assert.equal(sanitizeImageUrl(bad), null, JSON.stringify(bad));
	}
});
