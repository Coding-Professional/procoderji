import { notFound } from "next/navigation";
import { resolveSlugs } from "@/lib/courses";
import { CourseList } from "../list";

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
	const { courseSlug } = await params;
	const node = resolveSlugs([courseSlug]);
	if (!node || node.type !== "course") notFound();

	const items = node.course.branches.map((b) => ({ href: `/courses/${courseSlug}/${b.slug}`, label: b.title }));
	return <CourseList title={node.course.title} heading="Select Branch" items={items} emptyTitle="Branches are coming soon" />;
}
