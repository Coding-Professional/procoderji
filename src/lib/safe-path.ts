import fs from "node:fs";
import path from "node:path";

/**
 * Resolve `relative` inside `root`. Returns null if the result escapes `root`
 * (e.g. "../../.env") or if the input is absolute / contains NUL bytes.
 */
export function resolveWithin(root: string, relative: string): string | null {
	if (relative.includes("\0")) return null;
	const cleaned = relative.replace(/^[/\\]+/, "");
	if (path.isAbsolute(cleaned)) return null;
	const base = path.resolve(root);
	const full = path.resolve(base, cleaned);
	const rel = path.relative(base, full);
	if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
	return full;
}

/**
 * Like resolveWithin, but also follows symlinks: the file must exist and its REAL location
 * must be inside the real `root`. A symlink committed inside the content folder that points
 * elsewhere (for example at a .env file) is therefore refused. Returns the real path or null.
 */
export function resolveWithinReal(root: string, relative: string): string | null {
	const full = resolveWithin(root, relative);
	if (!full) return null;
	try {
		const realRoot = fs.realpathSync(root);
		const realFull = fs.realpathSync(full);
		const rel = path.relative(realRoot, realFull);
		if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
		return realFull;
	} catch {
		return null; // missing file or broken link
	}
}
