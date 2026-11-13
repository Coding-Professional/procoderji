import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Target } from "lucide-react";
import { PRACTICE_TOPICS, QUESTION_BANK } from "@/features/practice/domain";
import { secondaryAction } from "@/features/practice/client/styles";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Campus Placement Practice",
  description:
    "Practise quantitative aptitude, logical reasoning, verbal ability, and programming fundamentals with original questions and answer explanations.",
  path: "/practice",
});

export default function PracticePage() {
  return (
    <>
      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
        Prepare with purpose
      </p>
      <h1 className="workspace-heading mt-2">Campus placement practice</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        Work through short topic sessions. Understand why an answer works,
        review mistakes, and use your own progress to decide what comes next.
      </p>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-foreground">
        <span className="flex items-center gap-2">
          <Target aria-hidden="true" className="h-4 w-4 text-primary" />
          {QUESTION_BANK.length} original questions
        </span>
        <span className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 text-primary" />
          Self-paced sessions
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" />
          No login required
        </span>
      </div>
      <div className="practice-topics mt-9">
        {PRACTICE_TOPICS.map((topic, index) => (
          <article key={topic.id} className="practice-topic">
            <span className="text-xs font-bold tracking-widest text-muted-foreground">
              0{index + 1}
            </span>
            <h2 className="mt-3 text-xl font-bold">{topic.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
              {topic.description}
            </p>
            <p className="mt-5 text-xs font-medium text-muted-foreground">
              {QUESTION_BANK.filter((q) => q.topicId === topic.id).length}{" "}
              questions · Easy & medium · Explanations included
            </p>
            <Link
              href={`/practice/${topic.id}`}
              className={`${secondaryAction} mt-5 justify-between`}
            >
              Practise {topic.title}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
      <section className="mt-8 rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-bold">Learn from every attempt</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          These starter sets build familiarity with common reasoning and
          aptitude skills. They are independent learning exercises, and the
          small question bank is not a calibrated employer assessment. Use
          explanations alongside your course material and interview preparation.
        </p>
        <Link
          href="/games"
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
        >
          Try a warm-up game{" "}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}
