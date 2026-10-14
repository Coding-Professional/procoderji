import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL, missingLegalFields, isLegalComplete, legalSitemapRoutes, LEGAL_PAGES, type LegalDetails } from "./legal.ts";

const complete: LegalDetails = {
	...LEGAL,
	operatorName: "Example Operator",
	jurisdiction: "Example State, Example Country",
	effectiveDate: "2026-11-01",
};

test("the shipped details have no invented values", () => {
	assert.equal(LEGAL.operatorName, null);
	assert.equal(LEGAL.jurisdiction, null);
	assert.equal(LEGAL.effectiveDate, null);
	assert.equal(LEGAL.grievanceContact, null);
	assert.equal(LEGAL.postalAddress, null);
	assert.equal(LEGAL.contactEmail, "procoderji@gmail.com");
});

test("until the owner fills the required fields the legal pages count as a draft", () => {
	assert.deepEqual(missingLegalFields(LEGAL), ["operatorName", "jurisdiction", "effectiveDate"]);
	assert.equal(isLegalComplete(LEGAL), false);
});

test("blank or malformed values are still missing", () => {
	assert.deepEqual(missingLegalFields({ ...complete, operatorName: "   " }), ["operatorName"]);
	assert.deepEqual(missingLegalFields({ ...complete, effectiveDate: "1 Nov 2026" }), ["effectiveDate"]);
	assert.deepEqual(missingLegalFields({ ...complete, effectiveDate: "2026-13-40" }), ["effectiveDate"]);
});

test("a complete set is accepted", () => {
	assert.deepEqual(missingLegalFields(complete), []);
	assert.equal(isLegalComplete(complete), true);
});

test("legal pages stay out of the sitemap until complete", () => {
	assert.deepEqual(legalSitemapRoutes(LEGAL), []);
	const routes = legalSitemapRoutes(complete);
	assert.deepEqual(routes.map((r) => r.path), LEGAL_PAGES.map((p) => p.path));
	assert.ok(routes.every((r) => r.lastModified === "2026-11-01"));
});
