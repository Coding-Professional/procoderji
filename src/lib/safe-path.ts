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
