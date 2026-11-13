"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react";
import { getCourses } from "@/lib/courses";
import { dashboardHref } from "@/lib/catalog";
import { QUESTION_BANK, type OptionId } from "@/features/practice/domain";

const branches = getCourses().flatMap((course) =>
  course.branches.map((branch) => ({
    courseSlug: course.slug,
    slug: branch.slug,
    label: branch.short ?? branch.title,
    semesters: branch.semesters,
  })),
);
const sample = QUESTION_BANK.find(
  (question) => question.topicId === "quantitative",
)!;

function SampleQuestion() {
  const [answer, setAnswer] = useState<OptionId | null>(null);
  const [checked, setChecked] = useState(false);
  return (
    <div className="sample-question">
      <div className="sample-header">
        <span>THE PRACTICE DESK</span>
        <span>One question to get going</span>
      </div>
      <div className="sample-body">
        <p className="sample-label">Quantitative aptitude · A quick sample</p>
        <fieldset>
          <legend>{sample.prompt}</legend>
          <div className="sample-options">
            {sample.options.map((option) => (
              <label key={option.id} className="sample-option">
                <input
                  type="radio"
                  name="sample-question"
                  value={option.id}
                  aria-label={option.text}
                  checked={answer === option.id}
                  onChange={() => {
                    setAnswer(option.id);
                    setChecked(false);
                  }}
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sample-bottom">
          <button
            type="button"
            disabled={answer === null}
            className="pcj-button pcj-button-primary"
            onClick={() => setChecked(true)}
          >
            Check answer <ArrowRight aria-hidden="true" size={15} />
          </button>
          <span className="text-xs text-muted-foreground">
            Try it. No sign-in needed.
          </span>
        </div>
        <div aria-live="polite" aria-atomic="true">
          {checked && (
            <p className="sample-answer">
              <strong>
                {answer === sample.answerId
                  ? "You got it. "
                  : "Here’s how it works. "}
              </strong>
              {sample.explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="page-container hero-layout"
      aria-labelledby="home-heading"
    >
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="eyebrow-dot" /> A home for student life
        </div>
        <h1 id="home-heading" className="display-heading">
          For the semester.
          <br />
          <em>For what’s next.</em>
        </h1>
        <p>
          Course notes for the exam ahead. Practice for your first interview. A
          portfolio for the things you build. Find your next step here.
        </p>
        <div className="hero-actions">
          <Link href="/practice" className="pcj-button pcj-button-primary">
            Start placement practice <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Link href="/dashboard" className="pcj-button pcj-button-secondary">
            <BookOpen aria-hidden="true" size={16} /> Find your notes
          </Link>
        </div>
        <div className="hero-footnote">
          Free to start. Learn at your own pace.
        </div>
      </div>
      <SampleQuestion />
    </section>
  );
}

function BranchSelector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selected = branches.find(
    (branch) => branch.slug === searchParams.get("branch"),
  );
  return (
    <div className="notes-picker">
      <div className="notes-picker-head">
        <span className="inline-flex items-center gap-2" aria-live="polite">
          Branch <ChevronRight size={13} aria-hidden="true" />{" "}
          <strong>
            {selected
              ? `${selected.label} · Choose your semester`
              : "Choose your branch"}
          </strong>
        </span>
        {selected && (
          <button
            type="button"
            className="min-h-11 text-xs font-semibold underline underline-offset-4"
            onClick={() => router.push("/", { scroll: false })}
          >
            Change branch
          </button>
        )}
      </div>
      {!selected ? (
        <div className="branch-grid">
          {branches.map((branch) => (
            <button
              type="button"
              key={`${branch.courseSlug}/${branch.slug}`}
              className="branch-option"
              onClick={() =>
                router.push(`/?branch=${encodeURIComponent(branch.slug)}`, {
                  scroll: false,
                })
              }
            >
              {branch.label}
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="semester-grid">
          {selected.semesters.map((semester, index) => (
            <Link
              key={semester.slug}
              href={dashboardHref([
                selected.courseSlug,
                selected.slug,
                semester.slug,
              ])}
              className="semester-option"
            >
              <span>Semester</span>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>
                {semester.subjects.length
                  ? `${semester.subjects.length} subjects`
                  : "Coming soon"}
              </span>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        Don’t see your branch?{" "}
        <Link
          href="/#contact"
          className="font-medium underline underline-offset-4"
        >
          Request a subject.
        </Link>
      </p>
    </div>
  );
}

export function NotesFinder() {
  return (
    <section
      id="notes"
      className="section-block section-white"
      aria-labelledby="notes-heading"
    >
      <div className="page-container notes-layout">
        <div>
          <p className="eyebrow">Less hunting for the right material</p>
          <h2 id="notes-heading" className="section-title mt-4">
            Your semester,
            <br />
            sorted.
          </h2>
          <p className="section-description">
            Start with your branch and semester. Find the subject, open a unit,
            and get back to studying.
          </p>
          <Link href="/dashboard" className="text-link mt-4">
            Browse all course notes <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="notes-picker">
              <p className="text-sm font-medium">Choose your branch</p>
              <div className="branch-grid mt-4">
                {branches.map((branch) => (
                  <Link
                    key={branch.slug}
                    href={`/?branch=${branch.slug}`}
                    className="branch-option"
                  >
                    {branch.label}
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                ))}
              </div>
            </div>
          }
        >
          <BranchSelector />
        </Suspense>
      </div>
    </section>
  );
}
