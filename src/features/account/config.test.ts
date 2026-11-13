import { test } from "node:test";
import assert from "node:assert/strict";
import { BACKEND_PATHS, canonicalGoogleChallenge, isBackendPath, parseBackendOrigin } from "./config.ts";

const googleChallenge = (callback: string) => `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ redirect_uri: callback, state: "private-state" })}`;

test("OAuth starts on its callback host before setting a host-only correlation cookie", () => {
  const location = googleChallenge("https://procoderji.com/api/platform/signin-google");
  const request = "https://www.procoderji.com/api/platform/auth/google?returnTo=%2Flearn%2Fportfolio&code=discard-me";
  assert.equal(canonicalGoogleChallenge(request, location), "https://procoderji.com/api/platform/auth/google?returnTo=%2Flearn%2Fportfolio");
  assert.equal(canonicalGoogleChallenge("https://procoderji.com/api/platform/auth/google", location), null);
});

test("staging aliases restart on the staging callback host without leaking OAuth state", () => {
  const location = googleChallenge("https://procoderji-dev.vercel.app/api/platform/signin-google");
  const redirect = canonicalGoogleChallenge("https://unique-preview.vercel.app/api/platform/auth/google", location);
  assert.equal(redirect, "https://procoderji-dev.vercel.app/api/platform/auth/google");
  assert.ok(!redirect.includes("private-state"));
});

test("malformed or unrelated upstream redirects cannot become canonical login redirects", () => {
  const request = "https://preview.example.test/api/platform/auth/google";
  for (const location of [null, "not a URL", "https://unrelated.example.test/", googleChallenge("javascript:alert(1)"),
    googleChallenge("https://user:secret@example.test/api/platform/signin-google"), googleChallenge("https://example.test/wrong-path"),
    googleChallenge("https://example.test/api/platform/signin-google?secret=hidden"), googleChallenge("http://example.test/api/platform/signin-google")]) {
    assert.equal(canonicalGoogleChallenge(request, location), null);
  }
});

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
