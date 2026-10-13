import type { Metadata } from "next";
import { getCourses } from "@/lib/courses";
import { CourseList } from "./list";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
	const items = getCourses().map((c) => ({ href: `/courses/${c.slug}`, label: c.title }));
	return <CourseList title="Courses" items={items} emptyTitle="Courses are coming soon" />;
}
