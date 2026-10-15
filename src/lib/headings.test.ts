import { test } from "node:test";
import assert from "node:assert/strict";
import { serialize } from "next-mdx-remote/serialize";
import { demoteHeading } from "./headings.ts";
import { SAFE_MDX_OPTIONS } from "./mdx-safe.ts";

test("Markdown headings are demoted by one level and never go below h6", () => {
	assert.deepEqual(([1, 2, 3, 4, 5, 6] as const).map(demoteHeading), ["h2", "h3", "h4", "h5", "h6", "h6"]);
});

test("a note that starts with '# Title' still compiles to heading elements the page can demote", async () => {
	// The page renders its own <h1>; the note's "#" must map through the h1 component
	// (which renders an <h2>) rather than being emitted as a raw <h1> string.
	const { compiledSource } = await serialize("# Title\n\n## Part\n", SAFE_MDX_OPTIONS);
	assert.match(compiledSource, /_components\.h1|"h1"/);
	assert.ok(!/<h1>/.test(compiledSource));
});
