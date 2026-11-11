import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPublishedSnapshot, PublicationChangedError } from "./public-loader.ts";

const state = { username: "riya-student", version: "a".repeat(64), searchVisible: false, publishedAt: "2026-11-11T09:00:00.000Z" };
const payload = { ...state, data: { name: "Riya", headline: "Student", theme: "simple" } };

test("a disappearing publication rejects the cache load and can recover with the same version", async () => {
  await assert.rejects(loadPublishedSnapshot(async () => null, state), PublicationChangedError);
  assert.deepEqual(await loadPublishedSnapshot(async () => payload, state), payload);
});

test("malformed snapshots fail as service errors instead of cacheable missing pages", async () => {
  for (const invalid of [{}, { ...payload, data: {} }, { ...payload, version: "b".repeat(64) }]) {
    await assert.rejects(loadPublishedSnapshot(async () => invalid, state), error =>
      error instanceof Error && !(error instanceof PublicationChangedError) && /invalid public snapshot/.test(error.message));
  }
});

test("snapshot indexing and publication time must match the fresh public state", async () => {
  for (const changed of [{ ...payload, searchVisible: true }, { ...payload, publishedAt: "2026-11-11T10:00:00.000Z" }])
    await assert.rejects(loadPublishedSnapshot(async () => changed, state), /invalid public snapshot/);
});

test("upstream failures propagate without becoming publication changes", async () => {
  const unavailable = new Error("Unavailable");
  await assert.rejects(loadPublishedSnapshot(async () => { throw unavailable; }, state), error => error === unavailable);
});
