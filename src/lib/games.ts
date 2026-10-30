export interface PatternQuestion {
  sequence: number[];
  answer: number;
  options: number[];
  explanation: string;
}

export const PATTERN_QUESTIONS: readonly PatternQuestion[] = [
  { sequence: [3, 6, 9, 12], answer: 15, options: [13, 14, 15, 18], explanation: "Add 3 each time." },
  { sequence: [2, 4, 8, 16], answer: 32, options: [24, 30, 32, 36], explanation: "Double the previous number." },
  { sequence: [1, 4, 9, 16], answer: 25, options: [20, 24, 25, 36], explanation: "These are consecutive square numbers." },
  { sequence: [21, 18, 15, 12], answer: 9, options: [6, 8, 9, 10], explanation: "Subtract 3 each time." },
  { sequence: [1, 1, 2, 3, 5], answer: 8, options: [7, 8, 9, 10], explanation: "Add the previous two numbers." },
  { sequence: [5, 10, 20, 40], answer: 80, options: [60, 70, 75, 80], explanation: "Double the previous number." },
  { sequence: [2, 5, 10, 17], answer: 26, options: [24, 25, 26, 27], explanation: "The gaps are 3, 5, 7, then 9." },
  { sequence: [64, 32, 16, 8], answer: 4, options: [2, 4, 6, 8], explanation: "Halve the previous number." },
];

export function shuffledQuestions(random: () => number = Math.random): PatternQuestion[] {
  const questions = [...PATTERN_QUESTIONS];
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

export function makeDigits(length: number, random: () => number = Math.random): string {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("length must be a positive integer");
  return Array.from({ length }, () => Math.floor(random() * 10)).join("");
}
