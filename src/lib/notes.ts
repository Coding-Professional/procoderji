import fs from "node:fs";
import path from "node:path";
import { resolveWithinReal } from "./safe-path";

/**
 * Read a note's source from src/content. `unitPath` comes from courses.json
 * and may be "/content/...", "content/..." or "src/content/..."; anything that
 * does not resolve (including through symlinks) inside src/content is refused.
 */
export function readNote(unitPath: string): string | null {
	const rel = unitPath.replace(/^[/\\]+/, "").replace(/^src[/\\]/, "").replace(/^content[/\\]/, "");
	const root = path.join(/*turbopackIgnore: true*/ process.cwd(), "src", "content");
	const full = resolveWithinReal(root, rel); // also refuses symlinks that point outside src/content
	if (!full) return null;
	try {
		return fs.readFileSync(full, "utf8");
	} catch {
		return null;
	}
}
