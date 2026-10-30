import { test } from "node:test";
import assert from "node:assert/strict";
import { PATTERN_QUESTIONS, makeDigits, shuffledQuestions } from "./games.ts";

test("every pattern question has a unique correct option", () => {
  for (const question of PATTERN_QUESTIONS) {
    assert.equal(question.options.filter((option) => option === question.answer).length, 1);
    assert.equal(new Set(question.options).size, question.options.length);
    assert.ok(question.explanation.length > 0);
  }
});

test("shuffle preserves all questions and works with a deterministic random source", () => {
  const shuffled = shuffledQuestions(() => 0);
  assert.equal(shuffled.length, PATTERN_QUESTIONS.length);
  assert.deepEqual(new Set(shuffled), new Set(PATTERN_QUESTIONS));
  assert.notEqual(shuffled[0], PATTERN_QUESTIONS[0]);
});

test("digit generator preserves length including leading zeroes", () => {
  assert.equal(makeDigits(4, () => 0), "0000");
  assert.equal(makeDigits(3, () => 0.9), "999");
  assert.throws(() => makeDigits(0), RangeError);
});
