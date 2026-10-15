import { notFound } from "next/navigation";
import { resolveSlugs } from "@/lib/courses";
import { CourseList } from "../../list";

type Props = { params: Promise<{ courseSlug: string; branchSlug: string }> };

export default async function BranchPage({ params }: Props) {
	const { courseSlug, branchSlug } = await params;
	const node = resolveSlugs([courseSlug, branchSlug]);
	if (!node || node.type !== "branch") notFound();

	const items = node.branch.semesters.map((s) => ({
		href: `/courses/${courseSlug}/${branchSlug}/${s.slug}`,
		label: s.title,
	}));
	return <CourseList title={node.branch.title} heading="Select Semester" items={items} emptyTitle="Semesters are coming soon" />;
}
