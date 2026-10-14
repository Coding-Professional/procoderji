import { test } from "node:test";
import assert from "node:assert/strict";
import { isRealIsoDate } from "./dates.ts";

test("accepts real dates, including leap days", () => {
	for (const d of ["2026-10-14", "2026-01-31", "2028-02-29", "2000-02-29", "2026-12-31"]) {
		assert.equal(isRealIsoDate(d), true, d);
	}
});

test("rejects impossible calendar dates that Date.parse would roll over", () => {
	for (const d of ["2026-02-30", "2026-02-29", "2100-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-10-00", "2026-10-32"]) {
		assert.equal(isRealIsoDate(d), false, d);
	}
});

test("rejects other formats and empty values", () => {
	for (const d of ["", "2026-1-5", "5 Oct 2026", "2026/10/14", "2026-10-14T00:00:00Z", " 2026-10-14", undefined, null]) {
		assert.equal(isRealIsoDate(d as string), false, String(d));
	}
});
