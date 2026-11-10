import type { TopicId } from "../domain/types";

export const TOPIC_GUIDES: Record<
  TopicId,
  { introduction: string; steps: string[]; example: string }
> = {
  quantitative: {
    introduction:
      "Start by translating the words into quantities and units. Percentages, ratios, averages, and rates become easier when you can explain what each number represents before choosing a formula.",
    steps: [
      "Write down the starting quantity, the requested quantity, and their units.",
      "Estimate a reasonable answer before calculating. A discount should reduce a price; halving identical workers should increase the time for a fixed job.",
      "Check the denominator in a percentage or average. Review the explanation even when your answer is correct.",
    ],
    example:
      "A value rises from 80 to 100. The increase is 20, but the percentage increase is 20 ÷ 80 × 100 = 25%, because the starting value is the reference. The reverse change from 100 to 80 is a 20% decrease.",
  },
  reasoning: {
    introduction:
      "Separate the facts you are given from assumptions that merely seem likely. Number patterns, direction problems, ordering, and logical deductions each benefit from making the relationships visible on paper.",
    steps: [
      "For a sequence, compare consecutive differences and ratios before trying a more complex rule.",
      "For deductions, accept the stated premises for the exercise and choose only a conclusion that must follow.",
      "Draw a small table, line, or direction sketch when several relationships must be tracked together.",
    ],
    example:
      "If every red card is numbered and a card is red, that card must be numbered. If a card is numbered, however, you cannot conclude that it is red: the premise did not say that only red cards have numbers.",
  },
  verbal: {
    introduction:
      "Read the whole sentence before examining individual answer choices. Grammar questions depend on sentence structure; vocabulary questions depend on meaning and context. Aim to explain the choice rather than memorize a letter.",
    steps: [
      "Find the subject and verb, and check whether they agree in the stated register.",
      "For vocabulary, substitute the candidate meaning into the sentence and check whether the message stays clear.",
      "When reviewing a mistake, write one new sentence using the corrected pattern or word.",
    ],
    example:
      "In the sentence ‘The list of topics is ready’, the subject is ‘list’, not ‘topics’. The phrase ‘of topics’ describes the list, so the singular verb ‘is’ agrees with the singular subject.",
  },
  programming: {
    introduction:
      "Trace small examples carefully before reasoning about larger inputs. Programming fundamentals include understanding how values change, which data structure fits an operation, and how an algorithm's work grows with its input.",
    steps: [
      "Track variable values after each loop iteration instead of jumping to the final result.",
      "Check a small or empty input and distinguish the number of operations from the actual running time on one machine.",
      "Explain why a data structure supports an operation, then compare the alternative choices.",
    ],
    example:
      "A loop that visits each of n items once performs work proportional to n, commonly written O(n). Two complete passes still give O(n), while a nested loop visiting every pair of n items usually gives O(n²). Always examine the actual loop bounds.",
  },
};
