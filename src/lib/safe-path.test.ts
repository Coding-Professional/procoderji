import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWithinReal } from "./safe-path.ts";

function sandbox() {
	const base = fs.mkdtempSync(path.join(os.tmpdir(), "safe-path-"));
	const root = path.join(base, "content");
	const outside = path.join(base, "outside");
	fs.mkdirSync(path.join(root, "sub"), { recursive: true });
	fs.mkdirSync(outside);
	fs.writeFileSync(path.join(root, "sub", "note.mdx"), "ok");
	fs.writeFileSync(path.join(outside, "secret.txt"), "SECRET");
	return { base, root, outside };
}

// File symlinks can need elevated rights on Windows (skipped when not allowed); directory
// "junctions" do not, and realpath resolves them exactly like symlinks, so directory cases always run.
function trySymlink(target: string, link: string, type: "file" | "dir" | "junction"): boolean {
	try {
		fs.symlinkSync(target, link, type);
		return true;
	} catch {
		return false;
	}
}

test("real files inside the root resolve to their real path", () => {
	const { base, root } = sandbox();
	try {
		assert.equal(resolveWithinReal(root, "sub/note.mdx"), fs.realpathSync(path.join(root, "sub", "note.mdx")));
		assert.equal(resolveWithinReal(root, "/sub/note.mdx"), fs.realpathSync(path.join(root, "sub", "note.mdx")));
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});

test("missing files, traversal and absolute paths are refused", () => {
	const { base, root } = sandbox();
	try {
		assert.equal(resolveWithinReal(root, "sub/missing.mdx"), null);
		assert.equal(resolveWithinReal(root, "../outside/secret.txt"), null);
		assert.equal(resolveWithinReal(root, ""), null);
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});

test("a symlinked file that points outside the root is refused", (t) => {
	const { base, root, outside } = sandbox();
	try {
		if (!trySymlink(path.join(outside, "secret.txt"), path.join(root, "link.txt"), "file")) return t.skip("symlinks not permitted here");
		assert.equal(resolveWithinReal(root, "link.txt"), null);
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});

test("a symlinked directory that points outside the root is refused", (t) => {
	const { base, root, outside } = sandbox();
	try {
		if (!trySymlink(outside, path.join(root, "linkdir"), "junction")) return t.skip("links not permitted here");
		assert.equal(resolveWithinReal(root, "linkdir/secret.txt"), null);
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});

test("a symlink that stays inside the root is allowed", (t) => {
	const { base, root } = sandbox();
	try {
		if (!trySymlink(path.join(root, "sub", "note.mdx"), path.join(root, "alias.mdx"), "file")) return t.skip("symlinks not permitted here");
		assert.equal(resolveWithinReal(root, "alias.mdx"), fs.realpathSync(path.join(root, "sub", "note.mdx")));
	} finally {
		fs.rmSync(base, { recursive: true, force: true });
	}
});
