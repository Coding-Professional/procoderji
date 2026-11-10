export const TOPIC_IDS = [
  "quantitative",
  "reasoning",
  "verbal",
  "programming",
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];
export type Difficulty = "easy" | "medium";
export type OptionId = "a" | "b" | "c" | "d";

export interface PracticeOption {
  id: OptionId;
  text: string;
}

export interface PracticeQuestion {
  id: string;
  topicId: TopicId;
  difficulty: Difficulty;
  prompt: string;
  options: readonly [
    PracticeOption,
    PracticeOption,
    PracticeOption,
    PracticeOption,
  ];
  answerId: OptionId;
  explanation: string;
}

export interface PracticeTopic {
  id: TopicId;
  title: string;
  description: string;
}

/** The string option ID is validated against the question when responses are graded. */
export interface PracticeResponse {
  questionId: string;
  optionId: string;
}

export interface GradedAnswer {
  questionId: string;
  topicId: TopicId;
  selectedOptionId: OptionId | null;
  correctOptionId: OptionId;
  isCorrect: boolean;
  isAnswered: boolean;
}

export interface TopicSummary {
  topicId: TopicId;
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracyPercent: number;
}

export interface SessionSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  /** Correct answers divided by answered questions. Zero if none were answered. */
  accuracyPercent: number;
  /** Correct answers divided by all questions, including unanswered ones. */
  scorePercent: number;
  answers: GradedAnswer[];
  topics: TopicSummary[];
}

export interface PracticeRecommendation {
  topicId: TopicId;
  reason: "start" | "coverage" | "review" | "continue";
  message: string;
}
