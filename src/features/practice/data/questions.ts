import questionData from "../../../../shared/practice/questions.json" with { type: "json" };
import type { PracticeQuestion } from "../domain/types.ts";
import { validateQuestionBank } from "../domain/validation.ts";

/** The frontend and API use one reviewed question bank with stable IDs. */
export const QUESTION_BANK: readonly PracticeQuestion[] =
  questionData as unknown as readonly PracticeQuestion[];

const problems = validateQuestionBank(QUESTION_BANK);
if (problems.length)
  throw new Error(
    `Invalid shared practice question bank: ${problems.join("; ")}`,
  );
