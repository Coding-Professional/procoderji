import { QUESTION_BANK } from "../data/questions.ts";
import { PRACTICE_TOPICS } from "./topics.ts";
import type {
  Difficulty,
  PracticeQuestion,
  PracticeRecommendation,
  PracticeResponse,
  SessionSummary,
  TopicId,
  TopicSummary,
} from "./types.ts";

export interface SessionSelection {
  topicId?: TopicId;
  difficulty?: Difficulty;
  count?: number;
  random?: () => number;
}

/** Deterministic randomness for reproducible practice selections and tests. */
export function createSeededRandom(seed: number): () => number {
  if (!Number.isInteger(seed)) throw new RangeError("seed must be an integer");
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Filters and shuffles a copy; requesting more than the pool returns the whole pool. */
export function selectQuestions(
  questions: readonly PracticeQuestion[],
  selection: SessionSelection = {},
): PracticeQuestion[] {
  const { topicId, difficulty, count = 6, random = Math.random } = selection;
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("count must be a positive integer");
  const pool = questions.filter(
    (question) =>
      (!topicId || question.topicId === topicId) &&
      (!difficulty || question.difficulty === difficulty),
  );
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw new RangeError("random must return a value in [0, 1)");
    const target = Math.floor(value * (index + 1));
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }
  return pool.slice(0, count);
}

export function selectPracticeQuestions(
  selection: SessionSelection = {},
): PracticeQuestion[] {
  return selectQuestions(QUESTION_BANK, selection);
}

const percent = (numerator: number, denominator: number) =>
  denominator ? Math.round((numerator * 100) / denominator) : 0;

/** Each question counts once. For duplicates, the latest valid response wins. */
export function gradeSession(
  questions: readonly PracticeQuestion[],
  responses: readonly PracticeResponse[],
): SessionSummary {
  const questionById = new Map(
    questions.map((question) => [question.id, question]),
  );
  if (questionById.size !== questions.length)
    throw new Error("Session question IDs must be unique");
  const chosen = new Map<string, string>();
  for (const response of responses) {
    const question = questionById.get(response.questionId);
    if (question?.options.some((option) => option.id === response.optionId))
      chosen.set(response.questionId, response.optionId);
  }
  const answers = questions.map((question) => {
    const optionId = chosen.get(question.id);
    return {
      questionId: question.id,
      topicId: question.topicId,
      selectedOptionId:
        question.options.find((option) => option.id === optionId)?.id ?? null,
      correctOptionId: question.answerId,
      isCorrect: optionId === question.answerId,
      isAnswered: optionId !== undefined,
    };
  });
  const answered = answers.filter((answer) => answer.isAnswered).length;
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const topics = PRACTICE_TOPICS.map(({ id: topicId }) => {
    const topicAnswers = answers.filter((answer) => answer.topicId === topicId);
    const topicAnswered = topicAnswers.filter(
      (answer) => answer.isAnswered,
    ).length;
    const topicCorrect = topicAnswers.filter(
      (answer) => answer.isCorrect,
    ).length;
    return {
      topicId,
      totalQuestions: topicAnswers.length,
      answered: topicAnswered,
      correct: topicCorrect,
      incorrect: topicAnswered - topicCorrect,
      unanswered: topicAnswers.length - topicAnswered,
      accuracyPercent: percent(topicCorrect, topicAnswered),
    };
  });
  return {
    totalQuestions: questions.length,
    answered,
    correct,
    incorrect: answered - correct,
    unanswered: questions.length - answered,
    accuracyPercent: percent(correct, answered),
    scorePercent: percent(correct, questions.length),
    answers,
    topics,
  };
}

/** Combines topic totals from several completed sessions without averaging percentages. */
export function combineTopicSummaries(
  summaries: readonly TopicSummary[],
): TopicSummary[] {
  return PRACTICE_TOPICS.map(({ id: topicId }) => {
    const matching = summaries.filter((summary) => summary.topicId === topicId);
    const totalQuestions = matching.reduce(
      (sum, summary) => sum + summary.totalQuestions,
      0,
    );
    const answered = matching.reduce(
      (sum, summary) => sum + summary.answered,
      0,
    );
    const correct = matching.reduce((sum, summary) => sum + summary.correct, 0);
    return {
      topicId,
      totalQuestions,
      answered,
      correct,
      incorrect: answered - correct,
      unanswered: totalQuestions - answered,
      accuracyPercent: percent(correct, answered),
    };
  });
}

/** A transparent practice suggestion, never a placement-readiness prediction. */
export function recommendNextPractice(
  summaries: readonly TopicSummary[],
): PracticeRecommendation {
  const totals = combineTopicSummaries(summaries);
  if (totals.every((topic) => topic.answered === 0)) {
    return {
      topicId: "quantitative",
      reason: "start",
      message:
        "Start with a short quantitative aptitude session to see how the practice works.",
    };
  }
  const untried = totals.find((topic) => topic.answered === 0);
  if (untried) {
    const title = PRACTICE_TOPICS.find(
      (topic) => topic.id === untried.topicId,
    )!.title.toLowerCase();
    return {
      topicId: untried.topicId,
      reason: "coverage",
      message: `Try ${title} next; you have not answered a question in this topic yet.`,
    };
  }
  const weakest = [...totals].sort(
    (left, right) =>
      left.accuracyPercent - right.accuracyPercent ||
      left.answered - right.answered,
  )[0];
  if (weakest.accuracyPercent < 80) {
    return {
      topicId: weakest.topicId,
      reason: "review",
      message:
        "Practise this topic again and review the explanations; it has your lowest answer accuracy so far.",
    };
  }
  const leastPractised = [...totals].sort(
    (left, right) => left.answered - right.answered,
  )[0];
  return {
    topicId: leastPractised.topicId,
    reason: "continue",
    message:
      "Keep your practice balanced with the topic you have answered least often.",
  };
}
