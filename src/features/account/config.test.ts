import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKEND_PATHS, isBackendPath, parseBackendOrigin } from "./config.ts";

test("backend proxy accepts explicit root origins for local and hosted .NET services", () => {
  assert.equal(
    parseBackendOrigin("http://localhost:5100"),
    "http://localhost:5100",
  );
  assert.equal(
    parseBackendOrigin("http://backend:8080/"),
    "http://backend:8080",
  );
  assert.equal(
    parseBackendOrigin("https://api.example.org"),
    "https://api.example.org",
  );
});
test("backend proxy configuration rejects credentials, URL tricks and non-root destinations", () => {
  for (const value of [
    undefined,
    "",
    " localhost",
    "javascript:alert(1)",
    "https://user:secret@example.org",
    "https://example.org/api",
    "https://example.org?token=x",
    "https://example.org#x",
    "https://example.org\\evil",
    "file:///tmp/private",
  ])
    assert.equal(parseBackendOrigin(value), null);
});
test("backend proxy exposes only the learner API paths", () => {
  assert.ok(BACKEND_PATHS.has("auth/google"));
  assert.ok(BACKEND_PATHS.has("progress"));
  for (const path of [
    "admin",
    "../secrets",
    "auth/unknown",
    "billing/checkout",
  ])
    assert.ok(!BACKEND_PATHS.has(path));
});

test("portfolio proxy paths stay bounded to owner actions and one public username", () => {
  for (const path of [
    "portfolio", "portfolio/draft", "portfolio/username", "portfolio/publish",
    "portfolio/unpublish", "portfolio/public/riya-sharma", "portfolio/public/abc",
  ]) assert.ok(isBackendPath(path), path);
  for (const path of [
    "portfolio/admin", "portfolio/public/", "portfolio/public/ab", "portfolio/public/Abc",
    "portfolio/public/abc/extra", "portfolio/public/../account", "portfolio/public/abc%2fadmin",
    "portfolio/public/abc?other=path", "portfolio/public/-abc", "portfolio/public/abc--def",
    `portfolio/public/${"a".repeat(31)}`, "portfolio/public/abc\\admin",
  ]) assert.ok(!isBackendPath(path), path);
});
