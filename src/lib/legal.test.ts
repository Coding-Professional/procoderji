import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LEGAL, missingLegalFields, isLegalComplete, legalSitemapRoutes, LEGAL_PAGES, type LegalDetails } from "./legal.ts";
import { CONTACT_EMAIL } from "./contact.ts";

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

test("details the owner has not provided are not invented", () => {
	assert.equal(LEGAL.courtsLocation, null);
	assert.equal(LEGAL.effectiveDate, null);
	assert.equal(LEGAL.grievanceContact, null);
	assert.equal(LEGAL.postalAddress, null);
});

test("the legal pages remain a draft until every required field is complete", () => {
	assert.deepEqual(missingLegalFields(LEGAL), ["courtsLocation", "effectiveDate"]);
	assert.equal(isLegalComplete(LEGAL), false);
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
	assert.deepEqual(legalSitemapRoutes(LEGAL), []);
	const routes = legalSitemapRoutes(complete);
	assert.deepEqual(routes.map((r) => r.path), LEGAL_PAGES.map((p) => p.path));
	assert.ok(routes.every((r) => r.lastModified === "2026-11-01"));
});
