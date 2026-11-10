import { QUESTION_BANK } from "../practice/data/questions.ts";
import {
  TOPIC_IDS,
  type OptionId,
  type TopicId,
} from "../practice/domain/types.ts";

export const MAX_SAVED_ATTEMPTS = 100;
export const MAX_SESSION_QUESTIONS = 30;
export const MAX_DURATION_SECONDS = 7_200;

export interface AttemptRecord {
  id: string;
  completedAt: string;
  topicId: TopicId;
  questionIds: string[];
  responses: { questionId: string; optionId: OptionId }[];
  durationSeconds: number;
}

const questionById = new Map(
  QUESTION_BANK.map((question) => [question.id, question]),
);
const fields = [
  "id",
  "completedAt",
  "topicId",
  "questionIds",
  "responses",
  "durationSeconds",
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A reset generation is an opaque server-issued UUID, separate from an attempt ID. */
export function parseProgressGeneration(value: unknown): string | null {
  return typeof value === "string" && uuid.test(value)
    ? value.toLowerCase()
    : null;
}

/** Validate untrusted browser/API data against the current, canonical question bank. */
export function parseAttempt(
  value: unknown,
  now = Date.now(),
): AttemptRecord | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !fields.includes(key))
  )
    return null;
  const { id, completedAt, topicId, questionIds, responses, durationSeconds } =
    value;
  const parsedId = parseProgressGeneration(id);
  if (!parsedId) return null;
  if (
    typeof completedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(completedAt)
  )
    return null;
  const completedTime = Date.parse(completedAt);
  if (
    !Number.isFinite(completedTime) ||
    completedTime <= 0 ||
    completedTime > now + 300_000 ||
    new Date(completedTime).toISOString() !== completedAt
  )
    return null;
  if (typeof topicId !== "string" || !TOPIC_IDS.includes(topicId as TopicId))
    return null;
  if (
    !Number.isInteger(durationSeconds) ||
    (durationSeconds as number) < 0 ||
    (durationSeconds as number) > MAX_DURATION_SECONDS
  )
    return null;
  if (
    !Array.isArray(questionIds) ||
    questionIds.length < 1 ||
    questionIds.length > MAX_SESSION_QUESTIONS ||
    new Set(questionIds).size !== questionIds.length
  )
    return null;
  for (const questionId of questionIds) {
    if (
      typeof questionId !== "string" ||
      questionById.get(questionId)?.topicId !== topicId
    )
      return null;
  }
  if (!Array.isArray(responses) || responses.length > questionIds.length)
    return null;
  const answered = new Set<string>();
  const validResponses: AttemptRecord["responses"] = [];
  for (const response of responses) {
    if (
      !isRecord(response) ||
      Object.keys(response).some(
        (key) => key !== "questionId" && key !== "optionId",
      )
    )
      return null;
    const { questionId, optionId } = response;
    if (
      typeof questionId !== "string" ||
      !questionIds.includes(questionId) ||
      answered.has(questionId)
    )
      return null;
    const question = questionById.get(questionId);
    if (!question?.options.some((option) => option.id === optionId))
      return null;
    answered.add(questionId);
    validResponses.push({ questionId, optionId: optionId as OptionId });
  }
  return {
    id: parsedId,
    completedAt,
    topicId: topicId as TopicId,
    questionIds: [...questionIds] as string[],
    responses: validResponses,
    durationSeconds: durationSeconds as number,
  };
}

/** Read stored progress defensively; discard stale/invalid records and bound browser state. */
export function parseAttempts(value: unknown): AttemptRecord[] {
  if (!Array.isArray(value)) return [];
  const records = new Map<string, AttemptRecord>();
  for (const item of value.slice(0, 1_000)) {
    const attempt = parseAttempt(item);
    if (attempt && !records.has(attempt.id)) records.set(attempt.id, attempt);
  }
  return [...records.values()]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, MAX_SAVED_ATTEMPTS);
}
