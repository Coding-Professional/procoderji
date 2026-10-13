import { notFound } from "next/navigation";
import { resolveSlugs } from "@/lib/courses";
import { CourseList } from "../../../../list";

type Props = {
	params: Promise<{ courseSlug: string; branchSlug: string; semesterSlug: string; subjectSlug: string }>;
};

export default async function SubjectPage({ params }: Props) {
	const { courseSlug, branchSlug, semesterSlug, subjectSlug } = await params;
	const node = resolveSlugs([courseSlug, branchSlug, semesterSlug, subjectSlug]);
	if (!node || node.type !== "subject") notFound();

	const base = `/courses/${courseSlug}/${branchSlug}/${semesterSlug}/${subjectSlug}`;
	const items = node.subject.units.map((u) => ({ href: `${base}/${u.slug}`, label: u.title }));
	return <CourseList title={node.subject.title} heading="Units" items={items} emptyTitle="Units coming soon" />;
}
