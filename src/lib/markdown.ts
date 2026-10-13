// Minimal, dependency-free markdown parser used by the custom note reader.
// It only produces a plain data structure; rendering is done with React elements
// (never raw HTML), so note text cannot inject markup or attributes.

const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

/**
 * Returns a URL that is safe to put in an href, or null if it must not be used.
 * Allowed: http(s), mailto, and scheme-less relative URLs / fragments.
 * Everything else (javascript:, data:, vbscript:, file:, ...) is rejected.
 */
export function sanitizeUrl(raw: string): string | null {
	// Browsers ignore tabs/newlines/control chars inside a URL, so strip them
	// before looking for a scheme ("java\tscript:" must not slip through).
	const url = raw.replace(/[\u0000- \u007f-\u009f]/g, "");
	if (url === "") return null;
	if (url.includes("\\")) return null;
	if (url.startsWith("//")) return null; // protocol-relative: destination unclear

	const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i);
	if (scheme) {
		return SAFE_SCHEMES.has(scheme[1].toLowerCase()) ? raw.trim() : null;
	}
	return raw.trim();
}

export type Inline =
	| { type: "text"; value: string }
	| { type: "code"; value: string }
	| { type: "strong"; children: Inline[] }
	| { type: "em"; children: Inline[] }
	| { type: "link"; href: string; children: Inline[] };

export type Block =
	| { type: "heading"; level: number; text: string; id: string }
	| { type: "code"; lang: string; text: string }
	| { type: "hr" }
	| { type: "list"; ordered: boolean; items: Inline[][] }
	| { type: "paragraph"; children: Inline[] };

export function slugify(s: string): string {
	return s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

const INLINE_RE = /`([^`]+)`|\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function parseInline(text: string): Inline[] {
	const out: Inline[] = [];
	let last = 0;
	for (const m of text.matchAll(INLINE_RE)) {
		const index = m.index ?? 0;
		if (index > last) out.push({ type: "text", value: text.slice(last, index) });

		if (m[1] !== undefined) {
			out.push({ type: "code", value: m[1] });
		} else if (m[2] !== undefined) {
			// Optional markdown link title: [text](url "title")
			const target = m[3].trim().replace(/\s+"[^"]*"$/, "");
			const href = sanitizeUrl(target);
			const children = parseInline(m[2]);
			// Unsafe destinations degrade to plain text instead of a link.
			if (href === null) out.push(...children);
			else out.push({ type: "link", href, children });
		} else if (m[4] !== undefined) {
			out.push({ type: "strong", children: parseInline(m[4]) });
		} else if (m[5] !== undefined) {
			out.push({ type: "em", children: parseInline(m[5]) });
		}
		last = index + m[0].length;
	}
	if (last < text.length) out.push({ type: "text", value: text.slice(last) });
	return out;
}

export function parseBlocks(source: string): Block[] {
	const lines = source.split(/\r?\n/);
	const blocks: Block[] = [];
	const usedIds = new Map<string, number>();
	let paragraph: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length) {
			blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
			paragraph = [];
		}
	};

	const uniqueId = (text: string) => {
		const base = slugify(text) || "section";
		const n = usedIds.get(base) ?? 0;
		usedIds.set(base, n + 1);
		return n === 0 ? base : `${base}-${n}`;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const fence = line.match(/^```\s*([\w+-]*)/);
		if (fence) {
			flushParagraph();
			const body: string[] = [];
			i++;
			while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
			blocks.push({ type: "code", lang: fence[1] || "", text: body.join("\n") });
			continue;
		}

		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) {
			flushParagraph();
			const text = h[2].trim();
			blocks.push({ type: "heading", level: h[1].length, text, id: uniqueId(text) });
			continue;
		}

		if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
			flushParagraph();
			blocks.push({ type: "hr" });
			continue;
		}

		const li = line.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/);
		if (li) {
			flushParagraph();
			const ordered = li[2] !== undefined;
			const last = blocks[blocks.length - 1];
			const item = parseInline(li[3]);
			if (last && last.type === "list" && last.ordered === ordered) last.items.push(item);
			else blocks.push({ type: "list", ordered, items: [item] });
			continue;
		}

		if (line.trim() === "") {
			flushParagraph();
			continue;
		}

		paragraph.push(line.trim());
	}
	flushParagraph();
	return blocks;
}

export function extractHeadings(source: string) {
	return parseBlocks(source).flatMap((b) =>
		b.type === "heading" ? [{ level: b.level, text: b.text, id: b.id }] : []
	);
}
