import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK } from "../practice/data/questions.ts";
import type { AttemptRecord } from "./model.ts";
import { createProgressStore } from "./store.ts";

const question = QUESTION_BANK[0];
const firstId = "c359a679-f4be-4b0d-8c2b-ff0314e37228";
const secondId = "86a8dd35-29a5-4111-af02-ad449ca99ebd";
const makeAttempt = (
  overrides: Partial<AttemptRecord> = {},
): AttemptRecord => ({
  id: firstId,
  completedAt: "2026-11-01T10:00:00.000Z",
  topicId: question.topicId,
  questionIds: [question.id],
  responses: [{ questionId: question.id, optionId: question.answerId }],
  durationSeconds: 30,
  ...overrides,
});

function memoryStorage() {
  const values = new Map<string, string>();
  let failWrites = false;
  let failReads = false;
  return {
    values,
    setFailWrites: (value: boolean) => {
      failWrites = value;
    },
    setFailReads: (value: boolean) => {
      failReads = value;
    },
    getItem: (key: string) => {
      if (failReads) throw new Error("Storage is unavailable");
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error("Quota exceeded");
      values.set(key, value);
    },
  };
}

test("guest progress and separate accounts use isolated storage, including after clearing", () => {
  const storage = memoryStorage();
  const guest = createProgressStore("guest", () => storage);
  const account = createProgressStore("first-account", () => storage);
  const otherAccount = createProgressStore("second-account", () => storage);
  assert.notEqual(guest.key, account.key);
  assert.notEqual(account.key, otherAccount.key);
  guest.add(makeAttempt());
  account.add(makeAttempt({ id: secondId }));
  assert.deepEqual(
    guest.getSnapshot().attempts.map((attempt) => attempt.id),
    [firstId],
  );
  assert.deepEqual(
    account.getSnapshot().attempts.map((attempt) => attempt.id),
    [secondId],
  );
  assert.deepEqual(otherAccount.getSnapshot().attempts, []);
  account.replace([]);
  assert.deepEqual(
    createProgressStore("first-account", () => storage).getSnapshot().attempts,
    [],
  );
  assert.equal(
    createProgressStore("guest", () => storage).getSnapshot().attempts[0].id,
    firstId,
  );
});

test("saved progress survives a new store instance and duplicate saves do not inflate history", () => {
  const storage = memoryStorage();
  const store = createProgressStore("guest", () => storage);
  store.add(makeAttempt());
  store.add(
    makeAttempt({ id: secondId, completedAt: "2026-11-02T10:00:00.000Z" }),
  );
  store.add(makeAttempt({ durationSeconds: 45 }));
  const reloaded = createProgressStore("guest", () => storage).getSnapshot();
  assert.equal(reloaded.hydrated, true);
  assert.equal(reloaded.storageAvailable, true);
  assert.deepEqual(
    reloaded.attempts.map((attempt) => attempt.id),
    [secondId, firstId],
  );
  assert.equal(reloaded.attempts[1].durationSeconds, 45);
});

test("malformed or corrupted storage does not crash hydration or become progress", () => {
  const storage = memoryStorage();
  const key = createProgressStore("guest", () => storage).key;
  for (const corrupted of [
    "{not valid JSON",
    JSON.stringify({ attempts: [makeAttempt()] }),
    JSON.stringify([null, { id: "invented" }]),
  ]) {
    storage.values.set(key, corrupted);
    const snapshot = createProgressStore("guest", () => storage).getSnapshot();
    assert.deepEqual(snapshot.attempts, []);
    assert.equal(snapshot.hydrated, true);
    assert.equal(snapshot.storageAvailable, true);
  }
  const store = createProgressStore("guest", () => storage);
  store.add(makeAttempt());
  assert.equal(
    createProgressStore("guest", () => storage).getSnapshot().attempts.length,
    1,
  );
});

test("a quota failure preserves the new attempt in memory and leaves persisted progress intact", () => {
  const storage = memoryStorage();
  const store = createProgressStore("guest", () => storage);
  store.add(makeAttempt());
  const persistedBefore = storage.values.get(store.key);
  storage.setFailWrites(true);
  store.add(
    makeAttempt({ id: secondId, completedAt: "2026-11-02T10:00:00.000Z" }),
  );
  const snapshot = store.getSnapshot();
  assert.equal(snapshot.storageAvailable, false);
  assert.deepEqual(
    snapshot.attempts.map((attempt) => attempt.id),
    [secondId, firstId],
  );
  assert.equal(storage.values.get(store.key), persistedBefore);
  storage.setFailWrites(false);
  store.replace(snapshot.attempts);
  assert.equal(store.getSnapshot().storageAvailable, true);
  assert.equal(
    createProgressStore("guest", () => storage).getSnapshot().attempts.length,
    2,
  );
});

test("storage becoming unavailable does not discard attempts already loaded on this device", () => {
  const storage = memoryStorage();
  let available = true;
  const store = createProgressStore("guest", () =>
    available ? storage : undefined,
  );
  store.add(makeAttempt());
  available = false;
  store.add(
    makeAttempt({ id: secondId, completedAt: "2026-11-02T10:00:00.000Z" }),
  );
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(store.getSnapshot().attempts.length, 2);
  const inMemoryOnly = createProgressStore("guest", () => undefined);
  assert.equal(inMemoryOnly.getSnapshot().storageAvailable, false);
  inMemoryOnly.add(makeAttempt());
  assert.equal(inMemoryOnly.getSnapshot().attempts.length, 1);
});

test("storage access errors are contained and later saves remain available in memory", () => {
  const storage = memoryStorage();
  storage.setFailReads(true);
  storage.setFailWrites(true);
  const store = createProgressStore("guest", () => storage);
  assert.deepEqual(store.getSnapshot().attempts, []);
  assert.equal(store.getSnapshot().storageAvailable, false);
  store.add(makeAttempt());
  assert.equal(store.getSnapshot().attempts[0].id, firstId);
  assert.equal(store.getSnapshot().storageAvailable, false);
  const deniedStorage = createProgressStore("guest", () => {
    throw new Error("Access denied");
  });
  assert.doesNotThrow(() => deniedStorage.add(makeAttempt()));
  assert.equal(deniedStorage.getSnapshot().attempts.length, 1);
});

test("snapshots are stable between writes, and subscribers can unsubscribe", () => {
  const storage = memoryStorage();
  const store = createProgressStore("guest", () => storage);
  const serverSnapshot = store.getServerSnapshot();
  const hydrated = store.getSnapshot();
  assert.equal(store.getSnapshot(), hydrated);
  assert.equal(store.getServerSnapshot(), serverSnapshot);
  assert.equal(serverSnapshot.hydrated, false);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => {
    notifications += 1;
  });
  store.add(makeAttempt());
  assert.equal(notifications, 1);
  assert.notEqual(store.getSnapshot(), hydrated);
  assert.deepEqual(serverSnapshot.attempts, []);
  unsubscribe();
  store.replace([]);
  assert.equal(notifications, 1);
});

test("exclusive operations wait for earlier asynchronous work before starting", async () => {
  const store = createProgressStore("guest", () => memoryStorage());
  const order: string[] = [];
  let releaseFirst!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const first = store.runExclusive(async () => {
    order.push("first started");
    await gate;
    order.push("first completed");
  });
  const second = store.runExclusive(async () => {
    order.push("second completed");
  });
  await Promise.resolve();
  assert.deepEqual(order, ["first started"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, [
    "first started",
    "first completed",
    "second completed",
  ]);
});

test("a rejected exclusive operation is visible to its caller without poisoning the queue", async () => {
  const store = createProgressStore("guest", () => memoryStorage());
  const order: string[] = [];
  const failure = store.runExclusive(async () => {
    order.push("failed operation");
    throw new Error("Network failed");
  });
  const next = store.runExclusive(async () => {
    order.push("next operation");
  });
  await assert.rejects(failure, /Network failed/);
  await next;
  assert.deepEqual(order, ["failed operation", "next operation"]);
});

test("progress generations survive reload and remain isolated between learner scopes", () => {
  const storage = memoryStorage();
  const guest = createProgressStore("guest", () => storage);
  const account = createProgressStore("first-account", () => storage);
  assert.equal(guest.getGeneration(), null);
  guest.add(makeAttempt());
  guest.replace(guest.getSnapshot().attempts, firstId);
  account.replace([], secondId);
  assert.equal(
    createProgressStore("guest", () => storage).getGeneration(),
    firstId,
  );
  assert.equal(
    createProgressStore("first-account", () => storage).getGeneration(),
    secondId,
  );
  assert.equal(
    createProgressStore("other-account", () => storage).getGeneration(),
    null,
  );
  assert.equal(guest.getSnapshot().attempts.length, 1);
  assert.equal(account.getSnapshot().attempts.length, 0);
});

test("generation metadata remains usable in memory when browser storage is unavailable", () => {
  const store = createProgressStore("guest", () => undefined);
  store.replace([makeAttempt()], firstId);
  assert.equal(store.getGeneration(), firstId);
  assert.equal(store.getSnapshot().attempts.length, 1);
  const storage = memoryStorage();
  const account = createProgressStore("first-account", () => storage);
  account.getSnapshot();
  storage.setFailWrites(true);
  account.replace([makeAttempt()], secondId);
  assert.equal(account.getGeneration(), secondId);
  assert.equal(account.getSnapshot().attempts.length, 1);
});

test("attempts and their generation are persisted as one atomic envelope", () => {
  const storage = memoryStorage();
  const store = createProgressStore("first-account", () => storage);
  store.replace([makeAttempt()], firstId);
  const persisted = storage.values.get(store.key)!;
  assert.deepEqual(JSON.parse(persisted), {
    version: 1,
    generation: firstId,
    attempts: [makeAttempt()],
  });
  assert.deepEqual(
    [...storage.values.keys()],
    [store.key],
    "generation metadata must not use a separate key",
  );
  storage.setFailWrites(true);
  store.replace([makeAttempt({ id: secondId })], secondId);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(store.getGeneration(), secondId);
  assert.deepEqual(
    store.getSnapshot().attempts.map((attempt) => attempt.id),
    [secondId],
  );
  assert.equal(storage.values.get(store.key), persisted);
  const reloaded = createProgressStore("first-account", () => storage);
  assert.equal(reloaded.getGeneration(), firstId);
  assert.deepEqual(
    reloaded.getSnapshot().attempts.map((attempt) => attempt.id),
    [firstId],
  );
});

test("guest legacy arrays remain readable without treating account disk history as new", () => {
  const storage = memoryStorage();
  const guest = createProgressStore("guest", () => storage);
  const account = createProgressStore("first-account", () => storage);
  storage.values.set(guest.key, JSON.stringify([makeAttempt()]));
  storage.values.set(account.key, JSON.stringify([makeAttempt()]));
  assert.equal(guest.getSnapshot().attempts.length, 1);
  assert.equal(guest.getGeneration(), null);
  assert.deepEqual(guest.getNewAttempts(), []);
  assert.deepEqual(account.getSnapshot().attempts, []);
  assert.deepEqual(account.getNewAttempts(), []);
  storage.values.set(
    account.key,
    JSON.stringify({ version: 1, generation: null, attempts: [makeAttempt()] }),
  );
  const unknownGeneration = createProgressStore("first-account", () => storage);
  assert.equal(unknownGeneration.getSnapshot().attempts.length, 1);
  assert.equal(unknownGeneration.getGeneration(), null);
  assert.deepEqual(
    unknownGeneration.getNewAttempts(),
    [],
    "disk data must not become eligible for upload merely by reloading",
  );
});

test("only newly completed or explicitly imported attempts are marked as created here", () => {
  const storage = memoryStorage();
  const persisted = createProgressStore("first-account", () => storage);
  persisted.replace([makeAttempt()], firstId);
  const store = createProgressStore("first-account", () => storage);
  assert.deepEqual(store.getNewAttempts(), []);
  store.replace([makeAttempt(), makeAttempt({ id: secondId })], firstId);
  assert.deepEqual(
    store.getNewAttempts(),
    [],
    "remote replacement does not mark history as newly created",
  );
  const thirdId = "f8eec010-f4be-4b0d-8c2b-ff0314e37228";
  store.add(makeAttempt({ id: thirdId }));
  assert.deepEqual(
    store.getNewAttempts().map((attempt) => attempt.id),
    [thirdId],
  );
  store.addMany([makeAttempt()]);
  assert.deepEqual(
    new Set(store.getNewAttempts().map((attempt) => attempt.id)),
    new Set([firstId, thirdId]),
  );
  assert.equal(store.getGeneration(), firstId);
  assert.deepEqual(
    createProgressStore("first-account", () => storage).getNewAttempts(),
    [],
  );
  store.replace([], secondId);
  assert.deepEqual(
    store.getNewAttempts(),
    [],
    "removed records are never returned as fresh attempts",
  );
});
