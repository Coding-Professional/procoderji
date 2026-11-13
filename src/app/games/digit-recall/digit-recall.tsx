"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { makeDigits } from "@/lib/games";

type Phase = "ready" | "show" | "answer" | "feedback" | "complete";
const ROUND_COUNT = 5;

export function DigitRecall() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [round, setRound] = useState(0);
  const [digits, setDigits] = useState("");
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState(0);
  const answerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "show") return;
    const timer = window.setTimeout(() => setPhase("answer"), 4000);
    return () => window.clearTimeout(timer);
  }, [phase, round]);

  useEffect(() => {
    if (phase === "answer") answerRef.current?.focus();
  }, [phase]);

  function startRound(nextRound: number) {
    setRound(nextRound);
    setDigits(makeDigits(3 + nextRound));
    setGuess("");
    setPhase("show");
  }

  function start() {
    setScore(0);
    startRound(0);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "answer" || !guess) return;
    if (guess === digits) setScore((current) => current + 1);
    setPhase("feedback");
  }

  function next() {
    if (round + 1 === ROUND_COUNT) setPhase("complete");
    else startRound(round + 1);
  }

  return (
    <section aria-label="Digit Recall game" className="mt-8 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      {phase === "ready" && (
        <div className="space-y-5">
          <p className="text-lg font-semibold">Ready to test your memory?</p>
          <p className="leading-relaxed text-gray-600">A number appears for four seconds. When it disappears, type exactly what you saw. Leading zeroes count.</p>
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Start game</button>
        </div>
      )}

      {phase !== "ready" && phase !== "complete" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-gray-700">
          <span>Round {round + 1} of {ROUND_COUNT}</span>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-amber-900">{digits.length} digits</span>
        </div>
      )}

      {phase === "show" && (
        <div role="status" className="rounded-2xl bg-gray-50 p-8 text-center">
          <p className="font-semibold text-gray-600">Remember this number</p>
          <p className="mt-5 select-none break-all font-mono text-4xl font-bold tracking-[0.15em] text-gray-900 sm:text-5xl">{digits}</p>
          <p className="mt-5 text-sm text-gray-600">It disappears in four seconds.</p>
        </div>
      )}

      {phase === "answer" && (
        <form onSubmit={submit} className="space-y-5">
          <label htmlFor="digit-answer" className="block text-lg font-bold">What was the number?</label>
          <input ref={answerRef} id="digit-answer" name="answer" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]*" maxLength={digits.length} value={guess} onChange={(event) => setGuess(event.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 font-mono text-2xl tracking-widest text-gray-900 focus:border-amber-700 focus:outline-none" />
          <button type="submit" disabled={!guess} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>
        </form>
      )}

      {phase === "feedback" && (
        <div role="status" className="space-y-4">
          <h2 className="text-2xl font-bold">{guess === digits ? "Correct!" : "Not quite this time."}</h2>
          <p className="text-gray-700">The number was <strong className="font-mono tracking-widest">{digits}</strong>.</p>
          {guess !== digits && <p className="text-gray-700">You entered <strong className="font-mono tracking-widest">{guess}</strong>.</p>}
          <button type="button" onClick={next} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">{round + 1 === ROUND_COUNT ? "See result" : "Next round"}</button>
        </div>
      )}

      {phase === "complete" && (
        <div role="status" className="space-y-4">
          <p className="text-sm font-bold uppercase tracking-widest text-amber-800">Round complete</p>
          <h2 className="text-3xl font-extrabold">You recalled {score} out of {ROUND_COUNT}</h2>
          <p className="leading-relaxed text-gray-600">Play again to practise longer numbers.</p>
          <button type="button" onClick={start} className="min-h-11 rounded-xl bg-gray-900 px-7 py-3 font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900">Play again</button>
        </div>
      )}
    </section>
  );
}
