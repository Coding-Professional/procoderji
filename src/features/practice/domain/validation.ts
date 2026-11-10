import { TOPIC_IDS, type PracticeQuestion } from "./types.ts";

/** Content checks for contributors adding or editing question-bank entries. */
export function validateQuestionBank(
  questions: readonly PracticeQuestion[],
): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const question of questions) {
    const prefix = question.id || "(missing ID)";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(question.id))
      problems.push(`${prefix}: ID must be a stable lowercase slug`);
    if (ids.has(question.id)) problems.push(`${prefix}: duplicate ID`);
    ids.add(question.id);
    if (!TOPIC_IDS.includes(question.topicId))
      problems.push(`${prefix}: unknown topic`);
    if (question.difficulty !== "easy" && question.difficulty !== "medium")
      problems.push(`${prefix}: unknown difficulty`);
    if (!question.prompt.trim()) problems.push(`${prefix}: prompt is empty`);
    if (!question.explanation.trim())
      problems.push(`${prefix}: explanation is empty`);
    if (question.options.length !== 4)
      problems.push(`${prefix}: exactly four options are required`);
    if (new Set(question.options.map((option) => option.id)).size !== 4)
      problems.push(`${prefix}: option IDs must be unique`);
    if (
      question.options.some(
        (option) => !["a", "b", "c", "d"].includes(option.id),
      )
    )
      problems.push(`${prefix}: invalid option ID`);
    if (question.options.some((option) => !option.text.trim()))
      problems.push(`${prefix}: option text is empty`);
    if (
      new Set(question.options.map((option) => option.text.trim())).size !== 4
    )
      problems.push(`${prefix}: option text must be distinct`);
    if (
      question.options.filter((option) => option.id === question.answerId)
        .length !== 1
    )
      problems.push(`${prefix}: exactly one matching answer is required`);
  }
  return problems;
}
