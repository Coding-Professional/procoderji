"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import {
  getPracticeTopic,
  gradeSession,
  selectPracticeQuestions,
  QUESTION_BANK,
  type Difficulty,
  type OptionId,
  type PracticeQuestion,
  type TopicId,
} from "../domain";
import { useProgress } from "@/features/progress/progress-provider";
import type { AttemptRecord } from "@/features/progress/model";
import { primaryAction, secondaryAction } from "./styles";

export function PracticeSession({ topicId }: { topicId: TopicId }) {
  const topic = getPracticeTopic(topicId)!;
  const questionCount = QUESTION_BANK.filter(
    (question) => question.topicId === topicId,
  ).length;
  const { ready, saveAttempt, user, storageAvailable } = useProgress();
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, OptionId>>({});
  const [current, setCurrent] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [completed, setCompleted] = useState<AttemptRecord | null>(null);
  const [ownerScope, setOwnerScope] = useState<string | null>(null);
  const activeScope = user?.id ?? "guest";
  const finished = useRef(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  // DOM event timestamps and performance.now share a monotonic clock for duration.
  const start = (timestamp: number) => {
    finished.current = false;
    setOwnerScope(activeScope);
    setQuestions(
      selectPracticeQuestions({
        topicId,
        count,
        difficulty: difficulty === "all" ? undefined : difficulty,
      }),
    );
    setResponses({});
    setCurrent(0);
    setCompleted(null);
    setStartedAt(timestamp);
    requestAnimationFrame(() => questionHeading.current?.focus());
  };
  const move = (index: number) => {
    setCurrent(index);
    requestAnimationFrame(() => questionHeading.current?.focus());
  };
  const finish = () => {
    if (finished.current || ownerScope !== activeScope) return;
    finished.current = true;
    const attempt: AttemptRecord = {
      id: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
      topicId,
      questionIds: questions.map((question) => question.id),
      responses: questions.flatMap((question) =>
        responses[question.id]
          ? [{ questionId: question.id, optionId: responses[question.id] }]
          : [],
      ),
      durationSeconds: Math.min(
        7200,
        Math.max(0, Math.round((performance.now() - startedAt) / 1000)),
      ),
    };
    saveAttempt(attempt);
    setCompleted(attempt);
    requestAnimationFrame(() => resultHeading.current?.focus());
  };

  if (ownerScope && ownerScope !== activeScope)
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <h1 className="text-2xl font-bold">Your learning account changed</h1>
        <p className="mt-3 text-sm leading-7">
          Start a new session to save answers to the current workspace.
        </p>
        <button
          onClick={(event) => start(event.timeStamp)}
          className={`${primaryAction} mt-5`}
        >
          Start a new session
        </button>
      </section>
    );

  if (completed) {
    const summary = gradeSession(questions, completed.responses);
    return (
      <>
        <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
          Practice completed
        </p>
        <h1
          ref={resultHeading}
          tabIndex={-1}
          className="mt-2 text-3xl font-extrabold focus:outline-none"
        >
          Session complete
        </h1>
        <p className="mt-3 text-slate-600">
          Take a moment to review the reasoning. That is where this session pays
          off.
        </p>
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {topic.title}
              </p>
              <p className="mt-2 text-4xl font-extrabold">
                {summary.correct}
                <span className="text-lg font-medium text-slate-500">
                  {" "}
                  / {summary.totalQuestions} correct
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <p>
                <strong className="block text-xl text-emerald-700">
                  {summary.correct}
                </strong>
                Correct
              </p>
              <p>
                <strong className="block text-xl text-rose-700">
                  {summary.incorrect}
                </strong>
                Incorrect
              </p>
              <p>
                <strong className="block text-xl text-slate-600">
                  {summary.unanswered}
                </strong>
                Skipped
              </p>
            </div>
          </div>
          <p
            role="status"
            className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-600"
          >
            {!storageAvailable
              ? "This session is available for review here, but browser storage is unavailable."
              : user
                ? "Saved on this device. Your account syncs in the background."
                : "Saved in this browser. You can revisit your progress from My learning."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/learn" className={primaryAction}>
              Review progress{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <button
              onClick={(event) => start(event.timeStamp)}
              className={secondaryAction}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Practise again
            </button>
          </div>
        </section>
        <section className="mt-9">
          <h2 className="text-xl font-bold">Answer review</h2>
          <div className="mt-4 space-y-4">
            {questions.map((question, index) => {
              const answer = summary.answers.find(
                (item) => item.questionId === question.id,
              )!;
              const selected = question.options.find(
                (option) => option.id === answer.selectedOptionId,
              );
              const correct = question.options.find(
                (option) => option.id === answer.correctOptionId,
              )!;
              return (
                <article
                  key={question.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
                >
                  <p
                    className={`text-xs font-bold ${answer.isCorrect ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {index + 1}.{" "}
                    {answer.isCorrect
                      ? "Correct"
                      : answer.isAnswered
                        ? "Review this answer"
                        : "Not answered"}
                  </p>
                  <h3 className="mt-2 font-bold leading-7">
                    {question.prompt}
                  </h3>
                  <dl className="mt-3 space-y-2 text-sm leading-6">
                    <div>
                      <dt className="inline font-semibold">Your answer: </dt>
                      <dd className="inline">{selected?.text ?? "Skipped"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Correct answer: </dt>
                      <dd className="inline">{correct.text}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    {question.explanation}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  if (!questions.length)
    return (
      <>
        <Link
          href="/practice"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-600 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          All topics
        </Link>
        <p className="mt-6 text-xs font-bold tracking-widest text-slate-500 uppercase">
          Focused practice
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          {topic.title}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          {topic.description}
        </p>
        <section className="mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold">Make time for a small step</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Answer at your own pace, skip a question when needed, and review
            every explanation at the end. Answers save when you finish the
            session.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Session length
              <select
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
              >
                <option value={3}>Up to 3 questions</option>
                <option value={5}>Up to 5 questions</option>
                <option value={6}>Up to 6 questions</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Difficulty
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Difficulty | "all")
                }
                className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
              >
                <option value="all">Easy and medium</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            This topic has {questionCount} questions. A difficulty filter may
            shorten your session.
          </p>
          <button
            onClick={(event) => start(event.timeStamp)}
            disabled={!ready}
            className={`${primaryAction} mt-6`}
          >
            {ready ? "Start practice" : "Loading progress…"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      </>
    );

  const question = questions[current];
  const answered = Object.keys(responses).length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">
          {topic.title} · Self-paced practice
        </p>
        <p className="text-sm text-slate-500">
          {answered}/{questions.length} answered
        </p>
      </div>
      <h1 className="mt-4 text-2xl font-extrabold">{topic.title} practice</h1>
      <nav aria-label="Session questions" className="mt-6 flex flex-wrap gap-2">
        {questions.map((item, index) => (
          <button
            key={item.id}
            onClick={() => move(index)}
            aria-label={`Go to question ${index + 1}${responses[item.id] ? ", answered" : ""}`}
            aria-current={index === current ? "step" : undefined}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold ${index === current ? "border-slate-900 bg-slate-900 text-white" : responses[item.id] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-600"}`}
          >
            {index + 1}
          </button>
        ))}
      </nav>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
          Question {current + 1} of {questions.length} · {question.difficulty}
        </p>
        <h2
          ref={questionHeading}
          tabIndex={-1}
          className="mt-4 text-xl font-bold leading-8 focus:outline-none sm:text-2xl"
        >
          {question.prompt}
        </h2>
        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Choose one answer</legend>
          {question.options.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-slate-900 ${responses[question.id] === option.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <input
                type="radio"
                name={question.id}
                value={option.id}
                checked={responses[question.id] === option.id}
                onChange={() =>
                  setResponses((old) => ({ ...old, [question.id]: option.id }))
                }
                className="mt-1.5 h-4 w-4 shrink-0 accent-slate-900"
              />
              <span>
                <span className="mr-2 font-bold uppercase">{option.id}.</span>
                {option.text}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-7 flex flex-wrap justify-between gap-3">
          <button
            onClick={() => move(current - 1)}
            disabled={current === 0}
            className={secondaryAction}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Previous question
          </button>
          {current < questions.length - 1 ? (
            <button onClick={() => move(current + 1)} className={primaryAction}>
              Next question{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={finish} className={primaryAction}>
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              Finish session
            </button>
          )}
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-500">
          You can leave questions unanswered. Your review will show skipped
          answers separately.
        </p>
      </section>
    </>
  );
}
