"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Target,
} from "lucide-react";
import {
  QUESTION_BANK,
  PRACTICE_TOPICS,
  combineTopicSummaries,
  gradeSession,
  recommendNextPractice,
} from "../domain";
import { useProgress } from "@/features/progress/progress-provider";
import { primaryAction, secondaryAction } from "./styles";

export function LearnerDashboard() {
  const { attempts, ready, user, syncStatus, syncError } = useProgress();
  const [now] = useState(() => Date.now());
  const sessions = attempts.map((attempt) => ({
    attempt,
    summary: gradeSession(
      attempt.questionIds.flatMap((id) =>
        QUESTION_BANK.filter((q) => q.id === id),
      ),
      attempt.responses,
    ),
  }));
  const topics = combineTopicSummaries(
    sessions.flatMap(({ summary }) => summary.topics),
  );
  const recommendation = recommendNextPractice(topics);
  const nextTopic = PRACTICE_TOPICS.find(
    (topic) => topic.id === recommendation.topicId,
  )!;
  const answered = sessions.reduce(
    (sum, { summary }) => sum + summary.answered,
    0,
  );
  const correct = sessions.reduce(
    (sum, { summary }) => sum + summary.correct,
    0,
  );
  const weekly = attempts.filter(
    (attempt) => now - Date.parse(attempt.completedAt) < 7 * 86400000,
  ).length;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
            Your learning workspace
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Build skills. Keep moving.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            A little focused practice today. A clearer idea of what to work on
            tomorrow.
          </p>
        </div>
        <Link href="/practice" className={secondaryAction}>
          Browse practice <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      {!ready ? (
        <p
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          Loading your learning progress…
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Completed sessions",
                value: String(attempts.length),
                detail: "Your most recent 100 sessions",
                icon: CheckCircle2,
              },
              {
                label: "Questions answered",
                value: String(answered),
                detail: "Every attempt is another step",
                icon: BookOpen,
              },
              {
                label: "Practice accuracy",
                value: answered
                  ? `${Math.round((correct / answered) * 100)}%`
                  : "—",
                detail: answered
                  ? "Based on answered questions"
                  : "Complete a session to get started",
                icon: Target,
              },
            ].map(({ label, value, detail, icon: Icon }) => (
              <section
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                  <h2>{label}</h2>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </div>
                <p className="mt-3 text-3xl font-extrabold tabular-nums">
                  {value}
                </p>
                <p className="mt-2 text-xs text-slate-500">{detail}</p>
              </section>
            ))}
          </div>
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <p className="text-xs font-bold tracking-widest text-amber-800 uppercase">
              Your next step
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">{nextTopic.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700">
              {recommendation.message}
            </p>
            <Link
              href={`/practice/${nextTopic.id}`}
              className={`${primaryAction} mt-5`}
            >
              Start a short session{" "}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
          <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">Your skill picture</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Practice accuracy helps you choose a next topic. It isn’t a
                placement readiness score.
              </p>
              <div className="mt-5 space-y-5">
                {PRACTICE_TOPICS.map((topic) => {
                  const result = topics.find(
                    (item) => item.topicId === topic.id,
                  );
                  return (
                    <div key={topic.id}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <Link
                          href={`/practice/${topic.id}`}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {topic.title}
                        </Link>
                        <span className="text-slate-600">
                          {result?.answered
                            ? `${result.accuracyPercent}% · ${result.answered} answered`
                            : "Not started"}
                        </span>
                      </div>
                      <div
                        aria-hidden="true"
                        className="h-2 rounded-full bg-slate-100"
                      >
                        <div
                          className="h-2 rounded-full bg-amber-400"
                          style={{ width: `${result?.accuracyPercent ?? 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2">
                <CalendarDays
                  aria-hidden="true"
                  className="h-5 w-5 text-amber-700"
                />
                <h2 className="text-lg font-bold">A manageable weekly plan</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Suggested goal: three short sessions over seven days.
              </p>
              <p className="mt-4 text-3xl font-extrabold tabular-nums">
                {Math.min(weekly, 3)}{" "}
                <span className="text-base font-medium text-slate-500">
                  of 3 sessions
                </span>
              </p>
              <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <li>1. Practise your recommended topic.</li>
                <li>2. Review explanations for missed answers.</li>
                <li>3. Try a different topic to broaden your practice.</li>
              </ol>
              <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
                You choose the pace. Repeated questions count as practice, so
                accuracy is a learning aid rather than a benchmark.
              </p>
            </section>
          </div>
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Recent sessions</h2>
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
              >
                Manage my data
              </Link>
            </div>
            {sessions.length ? (
              <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {sessions.slice(0, 5).map(({ attempt, summary }) => (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-5"
                  >
                    <div>
                      <p className="font-semibold">
                        {
                          PRACTICE_TOPICS.find(
                            (topic) => topic.id === attempt.topicId,
                          )?.title
                        }
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(attempt.completedAt).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}{" "}
                        · {summary.answered} answered
                      </p>
                    </div>
                    <p className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold">
                      {summary.correct}/{summary.totalQuestions} correct
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-7">
                <h3 className="font-bold">Your first session starts here</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose a topic, try five questions, and review each
                  explanation. Your results will appear here.
                </p>
                <Link href="/practice" className={`${secondaryAction} mt-4`}>
                  Choose a topic{" "}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
          <p role="status" className="mt-6 text-xs leading-6 text-slate-500">
            {user
              ? syncStatus === "synced"
                ? "Your progress is synced to your account."
                : syncError ||
                  "Progress saves on this device while cloud sync catches up."
              : "Progress is saved in this browser. Clearing browser data removes guest progress."}
          </p>
        </>
      )}
    </>
  );
}
