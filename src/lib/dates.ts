/**
 * True only for a real calendar date written as YYYY-MM-DD.
 * (Date.parse alone is too lenient: it accepts "2026-02-30" and rolls it over to March.)
 */
export function isRealIsoDate(value: string | undefined | null): value is string {
	if (!value) return false;
	const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return false;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}
