import { notFound } from "next/navigation";
import {
  getPracticeTopic,
  isTopicId,
  PRACTICE_TOPICS,
} from "@/features/practice/domain";
import { PracticeSession } from "@/features/practice/client/practice-session";
import { pageMetadata } from "@/lib/seo";
import { TOPIC_GUIDES } from "@/features/practice/data/guides";

type Props = { params: Promise<{ topic: string }> };
export const generateStaticParams = () =>
  PRACTICE_TOPICS.map(({ id }) => ({ topic: id }));
export async function generateMetadata({ params }: Props) {
  const id = (await params).topic;
  const topic = isTopicId(id) ? getPracticeTopic(id) : undefined;
  if (!topic) return {};
  return pageMetadata({
    title: `${topic.title} Practice`,
    description: `${topic.description} Work through original practice questions and review a clear explanation for every answer.`,
    path: `/practice/${topic.id}`,
  });
}
export default async function TopicPage({ params }: Props) {
  const id = (await params).topic;
  const topic = isTopicId(id) ? getPracticeTopic(id) : undefined;
  if (!topic) notFound();
  const guide = TOPIC_GUIDES[topic.id];
  return (
    <>
      <PracticeSession topicId={topic.id} />
      <section
        aria-labelledby="topic-study-guide"
        className="mt-10 max-w-3xl border-t border-slate-200 pt-8"
      >
        <h2 id="topic-study-guide" className="text-xl font-bold">
          A useful way to practise {topic.title.toLowerCase()}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          {guide.introduction}
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-600">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3 className="mt-5 font-semibold">A worked example</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{guide.example}</p>
      </section>
    </>
  );
}
