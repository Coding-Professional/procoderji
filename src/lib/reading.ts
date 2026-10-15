const WORDS_PER_MINUTE = 200;

/** Whole minutes to read `text` (at least 1), counting words after stripping code fences. */
export function readingTimeMinutes(text: string): number {
	const words = text
		.replace(/```[\s\S]*?```/g, " ")
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-05" -> "5 Oct 2026". Returns null for anything that is not a real YYYY-MM-DD date. */
export function formatIsoDate(iso: string | undefined | null): string | null {
	if (!iso) return null;
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const [, y, mo, d] = m;
	const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
	if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) {
		return null;
	}
	return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
}
