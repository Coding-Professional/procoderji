import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMailto, CONTACT_EMAIL } from "./contact.ts";

const base = { name: "Asha", email: "asha@example.com", subject: "DSA notes", message: "Please add unit 3." };

test("builds a mailto URL to the contact address with subject and body", () => {
	const url = new URL(buildMailto(base));
	assert.equal(url.protocol, "mailto:");
	assert.equal(url.pathname, CONTACT_EMAIL);
	assert.equal(url.searchParams.get("subject"), "DSA notes");
	const body = url.searchParams.get("body") ?? "";
	assert.match(body, /Name: Asha/);
	assert.match(body, /Email: asha@example\.com/);
	assert.match(body, /Please add unit 3\./);
});

test("newlines in header fields cannot inject extra headers or recipients", () => {
	const url = buildMailto({ ...base, subject: "Hi\r\nBcc: victim@example.com", name: "A\nCc: x@y.z" });
	assert.ok(!/subject=[^&]*%0[DA]/i.test(url));
	const parsed = new URL(url);
	assert.equal(parsed.searchParams.get("subject"), "Hi Bcc: victim@example.com");
	assert.equal(parsed.searchParams.get("bcc"), null);
	assert.equal(parsed.searchParams.get("cc"), null);
	// A newline in the name must not start a new line in the body's header block.
	assert.equal((parsed.searchParams.get("body") ?? "").split("\n")[0], "Name: A Cc: x@y.z");
});

test("empty subject falls back, and long input is capped", () => {
	assert.equal(new URL(buildMailto({ ...base, subject: "  " })).searchParams.get("subject"), "Notes request");
	const long = new URL(buildMailto({ ...base, message: "x".repeat(10000) }));
	assert.ok((long.searchParams.get("body") ?? "").length <= 1500);
});
