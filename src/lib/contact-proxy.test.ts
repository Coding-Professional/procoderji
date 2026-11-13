import { test } from "node:test";
import assert from "node:assert/strict";
import { contactClientIp } from "./contact-proxy.ts";

test("contact rate limits use only a single platform-overwritten client IP", () => {
  const headers = new Headers({ "x-forwarded-for": "192.0.2.9", "x-contact-client-ip": "192.0.2.10" });
  assert.equal(contactClientIp(headers, true), null);
  headers.set("x-vercel-forwarded-for", "192.0.2.1");
  assert.equal(contactClientIp(headers, true), "192.0.2.1");
  headers.set("x-vercel-forwarded-for", "192.0.2.1, 192.0.2.2");
  assert.equal(contactClientIp(headers, true), null);
  headers.set("x-vercel-forwarded-for", "2001:db8::1");
  assert.equal(contactClientIp(headers, true), "2001:db8::1");
  assert.equal(contactClientIp(headers, false), "127.0.0.1");
});
