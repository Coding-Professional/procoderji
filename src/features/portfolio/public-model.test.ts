import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicState, parsePublishedPortfolio, portfolioCacheTag } from "./public-model.ts";

const state = { username: "riya-student", version: "a".repeat(64), searchVisible: false, publishedAt: "2026-11-11T09:00:00.000Z" };
test("public snapshots are bound to their username and publication version", () => {
  const payload = { ...state, data: { name: "Riya", headline: "Student", theme: "developer" }, userId: "private", revision: "private" };
  assert.deepEqual(parsePublishedPortfolio(payload, state.username, state.version), { ...state, data: payload.data });
  assert.equal(parsePublishedPortfolio(payload, "another-student", state.version), null);
  assert.equal(parsePublishedPortfolio(payload, state.username, "b".repeat(64)), null);
});
test("invalid or untrusted portfolio data cannot enter the public view model", () => {
  for (const data of [{}, { name: "Riya", headline: "Student", links: { website: "javascript:alert(1)" } }, { name: "Riya", headline: "Student", phone: "private" }])
    assert.equal(parsePublishedPortfolio({ ...state, data }, state.username, state.version), null);
  for (const patch of [{ version: "private-edit" }, { searchVisible: "yes" }, { publishedAt: "invalid" }])
    assert.equal(parsePublicState({ ...state, ...patch }, state.username), null);
  assert.throws(() => portfolioCacheTag("../account"));
  assert.equal(portfolioCacheTag(state.username), "portfolio:riya-student");
});
