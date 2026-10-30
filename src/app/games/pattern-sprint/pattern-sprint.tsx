"use client";

import { useEffect, useState } from "react";
import { PATTERN_QUESTIONS, shuffledQuestions, type PatternQuestion } from "@/lib/games";

type Phase = "ready" | "playing" | "complete";

export function PatternSprint() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [questions, setQuestions] = useState<PatternQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (phase !== "playing") return;
    let remaining = 60;
    const timer = window.setInterval(() => {
      remaining -= 1;
      setSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        setPhase("complete");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function start() {
    setQuestions(shuffledQuestions());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setSeconds(60);
    setPhase("playing");
  }

  const question = questions[index];

  function choose(option: number) {
    if (selected !== null || !question || phase !== "playing") return;
    setSelected(option);
    if (option === question.answer) setScore((current) => current + 1);
  }

  function next() {
    if (index + 1 === PATTERN_QUESTIONS.length) {
      setPhase("complete");
    } else {
      setIndex((current) => current + 1);
      setSelected(null);
    }
  }

  return (
    <section aria-label="Pattern Sprint game" className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      {phase === "ready" && (
        <div className="space-y-5">
          <p className="text-lg font-semibold">Ready to find the pattern?</p>
          <p className="leading-relaxed text-gray-600">Pick one answer per sequence. After you answer, you will see the rule. The clock starts when you press Start.</p>
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Start game</button>
        </div>
      )}

      {phase === "playing" && question && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-gray-700">
            <span>Question {index + 1} of {questions.length}</span>
            <span role="timer" aria-label={`${seconds} seconds remaining`} className="rounded-full bg-amber-100 px-4 py-2 text-amber-900">{seconds}s left</span>
          </div>
          <div className="mt-6 rounded-2xl bg-gray-50 p-5 sm:p-8">
            <p className="text-sm font-semibold text-gray-600">What comes next?</p>
            <p className="mt-3 break-words text-2xl font-extrabold tracking-wider text-gray-900 sm:text-3xl">{question.sequence.join("  ·  ")}  ·  ?</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3" aria-label="Answer options">
            {question.options.map((option) => {
              const answered = selected !== null;
              const isCorrect = option === question.answer;
              const isChosen = option === selected;
              return <button key={option} type="button" onClick={() => choose(option)} disabled={answered} aria-label={`Answer ${option}`} className={`min-h-14 rounded-xl border-2 px-4 py-3 text-lg font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-default ${answered && isCorrect ? "border-green-700 bg-green-50 text-green-900" : answered && isChosen ? "border-red-700 bg-red-50 text-red-900" : "border-gray-200 bg-white hover:border-amber-500 hover:bg-amber-50"}`}>{option}</button>;
            })}
          </div>
          {selected !== null && (
            <div role="status" className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-bold">{selected === question.answer ? "Correct!" : `The answer is ${question.answer}.`}</p>
              <p className="mt-1 text-gray-700">{question.explanation}</p>
              <button type="button" onClick={next} className="mt-5 min-h-11 rounded-xl bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">{index + 1 === questions.length ? "See result" : "Next question"}</button>
            </div>
          )}
        </div>
      )}

      {phase === "complete" && (
        <div role="status" className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-800">Round complete</p>
          <h2 className="text-3xl font-extrabold">You got {score} out of {questions.length}</h2>
          <p className="leading-relaxed text-gray-600">Try another round to get faster at spotting the rule.</p>
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Play again</button>
        </div>
      )}
    </section>
  );
}
