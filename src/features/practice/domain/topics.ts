import type { PracticeTopic, TopicId } from "./types.ts";

export const PRACTICE_TOPICS: readonly PracticeTopic[] = [
  {
    id: "quantitative",
    title: "Quantitative aptitude",
    description: "Practise percentages, ratios, averages, rates, and interest.",
  },
  {
    id: "reasoning",
    title: "Logical reasoning",
    description: "Work through patterns, deductions, directions, and ordering.",
  },
  {
    id: "verbal",
    title: "Verbal ability",
    description:
      "Build confidence with grammar, vocabulary, and clear meaning.",
  },
  {
    id: "programming",
    title: "Programming foundations",
    description: "Reason about simple code, data structures, and algorithms.",
  },
];

export function isTopicId(value: unknown): value is TopicId {
  return (
    typeof value === "string" &&
    PRACTICE_TOPICS.some((topic) => topic.id === value)
  );
}

export function getPracticeTopic(topicId: TopicId): PracticeTopic {
  return PRACTICE_TOPICS.find((topic) => topic.id === topicId)!;
}
