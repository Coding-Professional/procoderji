import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK } from "../practice/data/questions.ts";
import {
  parseAttempt,
  parseAttempts,
  parseProgressGeneration,
} from "./model.ts";

const question = QUESTION_BANK[0];
const makeAttempt = (overrides: Record<string, unknown> = {}) => ({
  id: "c359a679-f4be-4b0d-8c2b-ff0314e37228",
  completedAt: "2026-11-01T10:00:00.000Z",
  topicId: question.topicId,
  questionIds: [question.id],
  responses: [{ questionId: question.id, optionId: question.options[0].id }],
  durationSeconds: 30,
  ...overrides,
});

test("progress retains raw responses without accepting client-provided scores", () => {
  const parsed = parseAttempt(makeAttempt());
  assert.equal(parsed?.responses[0].questionId, question.id);
  assert.equal(parseAttempt(makeAttempt({ correct: 99 })), null);
  assert.equal(parseAttempt(makeAttempt({ scorePercent: 100 })), null);
});

test("progress rejects unknown questions, mismatched topics and invalid options", () => {
  assert.equal(parseAttempt(makeAttempt({ questionIds: ["made-up"] })), null);
  assert.equal(parseAttempt(makeAttempt({ topicId: "reasoning" })), null);
  assert.equal(
    parseAttempt(
      makeAttempt({ responses: [{ questionId: question.id, optionId: "z" }] }),
    ),
    null,
  );
  assert.equal(
    parseAttempt(
      makeAttempt({ responses: [{ questionId: "made-up", optionId: "a" }] }),
    ),
    null,
  );
});

test("a session cannot count a question or response twice", () => {
  assert.equal(
    parseAttempt(makeAttempt({ questionIds: [question.id, question.id] })),
    null,
  );
  const response = { questionId: question.id, optionId: "a" };
  assert.equal(
    parseAttempt(makeAttempt({ responses: [response, response] })),
    null,
  );
  assert.ok(parseAttempt(makeAttempt({ responses: [] })));
});

test("progress rejects malformed IDs, timestamps and durations", () => {
  assert.equal(parseAttempt(makeAttempt({ id: "not-a-uuid" })), null);
  assert.equal(
    parseAttempt(makeAttempt({ completedAt: "2026-02-31T10:00:00.000Z" })),
    null,
  );
  assert.equal(
    parseAttempt(makeAttempt({ completedAt: "2099-01-01T10:00:00.000Z" })),
    null,
  );
  assert.equal(parseAttempt(makeAttempt({ durationSeconds: -1 })), null);
  assert.equal(parseAttempt(makeAttempt({ durationSeconds: 7_201 })), null);
  assert.equal(parseAttempt(makeAttempt({ durationSeconds: 2.5 })), null);
});

test("stored progress is validated, deduplicated, sorted and bounded", () => {
  const first = makeAttempt();
  const second = makeAttempt({
    id: "86a8dd35-29a5-4111-af02-ad449ca99ebd",
    completedAt: "2026-11-02T10:00:00.000Z",
  });
  const parsed = parseAttempts([first, null, second, first]);
  assert.deepEqual(
    parsed.map((attempt) => attempt.id),
    [second.id, first.id],
  );
  assert.deepEqual(parseAttempts({ attempts: [first] }), []);
  const many = Array.from({ length: 120 }, (_, index) =>
    makeAttempt({
      id: `${index.toString(16).padStart(8, "0")}-29a5-4111-af02-ad449ca99ebd`,
    }),
  );
  assert.equal(parseAttempts(many).length, 100);
});

test("reset generation accepts only an opaque UUID and normalizes its case", () => {
  assert.equal(
    parseProgressGeneration("C359A679-F4BE-4B0D-8C2B-FF0314E37228"),
    "c359a679-f4be-4b0d-8c2b-ff0314e37228",
  );
  for (const invalid of [
    null,
    undefined,
    "",
    "guest",
    1,
    {},
    "00000000-0000-0000-0000-000000000000",
  ]) {
    assert.equal(parseProgressGeneration(invalid), null);
  }
});
