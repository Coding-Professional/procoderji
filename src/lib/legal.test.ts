import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LEGAL, missingLegalFields, isLegalComplete, legalSitemapRoutes, LEGAL_PAGES, type LegalDetails } from "./legal.ts";
import { CONTACT_EMAIL } from "./contact.ts";
import { isRealIsoDate } from "./dates.ts";

const complete: LegalDetails = {
	...LEGAL,
	courtsLocation: "Example City, Example State",
	effectiveDate: "2026-11-01",
};

test("confirmed details are filled in and consistent with the project", () => {
	assert.equal(LEGAL.operatorName, "Satyam Yadav");
	assert.equal(LEGAL.operatorType, "individual");
	assert.equal(LEGAL.governingLaw, "India");
	// Same address the contact form and footer publish.
	assert.equal(LEGAL.contactEmail, CONTACT_EMAIL);
	assert.equal(LEGAL.contactEmail, "procoderji@gmail.com");
	// The operator matches the copyright holder in the repository LICENSE.
	assert.match(fs.readFileSync("LICENSE", "utf8"), new RegExp(`Copyright \\(c\\) \\d{4} ${LEGAL.operatorName}`));
});

test("the draft state always matches the shipped details", () => {
	// Holds both before and after the owner fills in the remaining fields.
	const missing = missingLegalFields(LEGAL);
	assert.equal(isLegalComplete(LEGAL), missing.length === 0);
	assert.equal(legalSitemapRoutes(LEGAL).length > 0, missing.length === 0);
	// Anything still missing is genuinely empty or invalid, never a placeholder string.
	for (const f of missing) assert.ok(!LEGAL[f] || !isRealIsoDate(LEGAL[f]) || f !== "effectiveDate");
	for (const v of [LEGAL.operatorName, LEGAL.governingLaw, LEGAL.courtsLocation, LEGAL.grievanceContact, LEGAL.postalAddress]) {
		assert.ok(v === null || (v.trim() !== "" && !/required|todo|tbd|xxx/i.test(v)), `placeholder-looking value: ${v}`);
	}
});

test("blank or malformed values are still missing", () => {
	assert.deepEqual(missingLegalFields({ ...complete, operatorName: "   " }), ["operatorName"]);
	assert.deepEqual(missingLegalFields({ ...complete, governingLaw: null }), ["governingLaw"]);
	assert.deepEqual(missingLegalFields({ ...complete, courtsLocation: "" }), ["courtsLocation"]);
	assert.deepEqual(missingLegalFields({ ...complete, effectiveDate: "1 Nov 2026" }), ["effectiveDate"]);
	assert.deepEqual(missingLegalFields({ ...complete, effectiveDate: "2026-13-40" }), ["effectiveDate"]);
});

test("a complete set is accepted", () => {
	assert.deepEqual(missingLegalFields(complete), []);
	assert.equal(isLegalComplete(complete), true);
});

test("legal pages stay out of the sitemap until complete", () => {
	assert.deepEqual(legalSitemapRoutes({ ...complete, courtsLocation: null }), []);
	assert.deepEqual(legalSitemapRoutes({ ...complete, effectiveDate: null }), []);
	const routes = legalSitemapRoutes(complete);
	assert.deepEqual(routes.map((r) => r.path), LEGAL_PAGES.map((p) => p.path));
	assert.ok(routes.every((r) => r.lastModified === "2026-11-01"));
});

test("an impossible effective date such as 30 February is still missing", () => {
	assert.deepEqual(missingLegalFields({ ...complete, effectiveDate: "2026-02-30" }), ["effectiveDate"]);
});
