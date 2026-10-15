import { notFound } from "next/navigation";
import { resolveSlugs } from "@/lib/courses";
import { CourseList } from "../../../list";

type Props = { params: Promise<{ courseSlug: string; branchSlug: string; semesterSlug: string }> };

export default async function SemesterPage({ params }: Props) {
	const { courseSlug, branchSlug, semesterSlug } = await params;
	const node = resolveSlugs([courseSlug, branchSlug, semesterSlug]);
	if (!node || node.type !== "semester") notFound();

	const items = node.semester.subjects.map((su) => ({
		href: `/courses/${courseSlug}/${branchSlug}/${semesterSlug}/${su.slug}`,
		label: su.title,
	}));
	return (
		<CourseList
			title={`${node.branch.short ?? node.branch.title} - ${node.semester.title}`}
			heading="Subjects"
			items={items}
			emptyTitle="Notes coming soon"
		/>
	);
}
