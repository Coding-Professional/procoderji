import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTION_BANK } from "../data/questions.ts";
import { PRACTICE_TOPICS, isTopicId } from "./topics.ts";
import {
  combineTopicSummaries,
  createSeededRandom,
  gradeSession,
  recommendNextPractice,
  selectPracticeQuestions,
  selectQuestions,
} from "./session.ts";
import { validateQuestionBank } from "./validation.ts";
import type { PracticeQuestion, TopicSummary } from "./types.ts";

test("the question bank has valid stable IDs and covers each topic and difficulty", () => {
  assert.deepEqual(validateQuestionBank(QUESTION_BANK), []);
  assert.ok(QUESTION_BANK.length >= 24);
  for (const topic of PRACTICE_TOPICS) {
    const questions = QUESTION_BANK.filter(
      (question) => question.topicId === topic.id,
    );
    assert.ok(questions.length >= 6, topic.id);
    assert.ok(questions.some((question) => question.difficulty === "easy"));
    assert.ok(questions.some((question) => question.difficulty === "medium"));
    assert.ok(isTopicId(topic.id));
  }
  assert.equal(isTopicId("constructor"), false);
  assert.equal(isTopicId(null), false);
});

test("question validation reports ambiguous option IDs, missing explanations, and duplicate questions", () => {
  const source = QUESTION_BANK[0];
  const broken: PracticeQuestion = {
    ...source,
    explanation: " ",
    options: [
      { ...source.options[0], id: "a" },
      { ...source.options[1], id: "a" },
      { ...source.options[2], id: "a" },
      { ...source.options[3], id: "a" },
    ],
  };
  const problems = validateQuestionBank([broken, source]);
  assert.ok(
    problems.some((problem) => problem.includes("option IDs must be unique")),
  );
  assert.ok(
    problems.some((problem) => problem.includes("explanation is empty")),
  );
  assert.ok(problems.some((problem) => problem.includes("duplicate ID")));
  assert.ok(
    problems.some((problem) => problem.includes("exactly one matching answer")),
  );
});

test("seeded selection is reproducible, unique, and leaves the bank unchanged", () => {
  const before = QUESTION_BANK.map((question) => question.id);
  const first = selectPracticeQuestions({
    count: 12,
    random: createSeededRandom(2026),
  });
  const repeated = selectPracticeQuestions({
    count: 12,
    random: createSeededRandom(2026),
  });
  assert.deepEqual(first, repeated);
  assert.equal(new Set(first.map((question) => question.id)).size, 12);
  assert.deepEqual(
    QUESTION_BANK.map((question) => question.id),
    before,
  );
  assert.notDeepEqual(
    first.map((question) => question.id),
    selectPracticeQuestions({ count: 12, random: createSeededRandom(8) }).map(
      (question) => question.id,
    ),
  );
});

test("selection respects topic and difficulty and caps the count at the matching pool", () => {
  const selected = selectPracticeQuestions({
    topicId: "quantitative",
    difficulty: "medium",
    count: 99,
    random: () => 0,
  });
  assert.equal(
    selected.length,
    QUESTION_BANK.filter(
      (question) =>
        question.topicId === "quantitative" && question.difficulty === "medium",
    ).length,
  );
  assert.ok(
    selected.every(
      (question) =>
        question.topicId === "quantitative" && question.difficulty === "medium",
    ),
  );
  assert.deepEqual(selectQuestions([], { count: 4 }), []);
  assert.throws(() => selectPracticeQuestions({ count: 0 }), RangeError);
  assert.throws(() => selectPracticeQuestions({ count: 1.5 }), RangeError);
  assert.throws(() => selectPracticeQuestions({ random: () => 1 }), RangeError);
  assert.throws(
    () => selectPracticeQuestions({ random: () => -0.1 }),
    RangeError,
  );
  assert.throws(
    () => selectPracticeQuestions({ random: () => NaN }),
    RangeError,
  );
});

test("grading counts each question once and uses the last valid response", () => {
  const questions = QUESTION_BANK.slice(0, 3);
  const first = questions[0];
  const second = questions[1];
  const wrongOption = second.options.find(
    (option) => option.id !== second.answerId,
  )!.id;
  const summary = gradeSession(questions, [
    {
      questionId: first.id,
      optionId: first.options.find((option) => option.id !== first.answerId)!
        .id,
    },
    { questionId: first.id, optionId: first.answerId },
    { questionId: first.id, optionId: "not-an-option" },
    { questionId: second.id, optionId: wrongOption },
    { questionId: "unknown-question", optionId: "a" },
  ]);
  assert.equal(summary.totalQuestions, 3);
  assert.equal(summary.answered, 2);
  assert.equal(summary.correct, 1);
  assert.equal(summary.incorrect, 1);
  assert.equal(summary.unanswered, 1);
  assert.equal(summary.accuracyPercent, 50);
  assert.equal(summary.scorePercent, 33);
  assert.equal(summary.answers[0].selectedOptionId, first.answerId);
  assert.equal(summary.answers[2].selectedOptionId, null);
  assert.equal(summary.answers[2].isAnswered, false);
  assert.equal(
    summary.topics.find((topic) => topic.topicId === "quantitative")!
      .unanswered,
    1,
  );
});

test("empty sessions and fully unanswered sessions have zero percentages, not NaN", () => {
  const empty = gradeSession([], []);
  assert.equal(empty.accuracyPercent, 0);
  assert.equal(empty.scorePercent, 0);
  assert.equal(empty.topics.length, 4);
  const unanswered = gradeSession(QUESTION_BANK.slice(0, 2), []);
  assert.equal(unanswered.unanswered, 2);
  assert.equal(unanswered.answered, 0);
  assert.equal(unanswered.correct, 0);
  assert.equal(unanswered.accuracyPercent, 0);
});

test("duplicate question IDs are rejected rather than inflating scores", () => {
  assert.throws(
    () => gradeSession([QUESTION_BANK[0], QUESTION_BANK[0]], []),
    /unique/,
  );
});

const topicSummary = (
  topicId: TopicSummary["topicId"],
  answered: number,
  correct: number,
): TopicSummary => ({
  topicId,
  totalQuestions: answered,
  answered,
  correct,
  incorrect: answered - correct,
  unanswered: 0,
  accuracyPercent: answered ? Math.round((correct * 100) / answered) : 0,
});

test("topic summaries aggregate counts before calculating accuracy", () => {
  const combined = combineTopicSummaries([
    topicSummary("quantitative", 1, 1),
    topicSummary("quantitative", 9, 0),
    topicSummary("reasoning", 2, 2),
  ]);
  assert.equal(combined[0].answered, 10);
  assert.equal(combined[0].correct, 1);
  assert.equal(combined[0].accuracyPercent, 10);
  assert.equal(combined[1].accuracyPercent, 100);
  assert.equal(combined[2].answered, 0);
});

test("practice recommendations cover new topics before suggesting review of the weakest one", () => {
  assert.deepEqual(recommendNextPractice([]).topicId, "quantitative");
  assert.equal(recommendNextPractice([]).reason, "start");
  const coverage = recommendNextPractice([topicSummary("quantitative", 6, 1)]);
  assert.equal(coverage.topicId, "reasoning");
  assert.equal(coverage.reason, "coverage");
  const review = recommendNextPractice([
    topicSummary("quantitative", 6, 5),
    topicSummary("reasoning", 6, 2),
    topicSummary("verbal", 6, 4),
    topicSummary("programming", 6, 6),
  ]);
  assert.equal(review.topicId, "reasoning");
  assert.equal(review.reason, "review");
});

test("strong results recommend the least-practised topic without a hiring prediction", () => {
  const recommendation = recommendNextPractice([
    topicSummary("quantitative", 12, 11),
    topicSummary("reasoning", 10, 9),
    topicSummary("verbal", 5, 5),
    topicSummary("programming", 6, 6),
  ]);
  assert.equal(recommendation.topicId, "verbal");
  assert.equal(recommendation.reason, "continue");
  assert.ok(
    !/ready for placement|hiring score|guarantee/i.test(recommendation.message),
  );
});
