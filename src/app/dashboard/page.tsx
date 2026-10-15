import type { Metadata } from "next";
import { NoteCard } from "@/components/note-card";
import { EmptyState } from "@/components/empty-state";
import { pageMetadata } from "@/lib/seo";
import { getCourses } from "@/lib/courses";
import { countSubjects, dashboardHref } from "@/lib/catalog";

export const metadata: Metadata = pageMetadata({
    title: "Browse Notes",
    description: "Browse ProCoderJii notes by course, branch and semester.",
    path: "/dashboard",
});

export default function DashboardPage() {
    const courses = getCourses();
    const totalSubjects = courses.reduce((n, c) => n + countSubjects(c), 0);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Browse Notes</h1>
                <p className="text-gray-500 font-medium">
                    Pick a branch and semester to find notes from the ProCoderJii community.
                </p>
            </div>

            {totalSubjects === 0 && (
                <EmptyState
                    title="Notes are coming soon"
                    description="The branches and semesters below are ready, but we have not published subject notes yet. Request a subject and we will prioritise it."
                />
            )}

            {courses.map((course) => (
                <section key={course.slug} aria-labelledby={`course-${course.slug}`}>
                    <h2 id={`course-${course.slug}`} className="text-xl font-bold text-gray-900 mb-6">
                        {course.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {course.branches.map((branch) => {
                            const subjects = countSubjects(branch);
                            return (
                                <NoteCard
                                    key={branch.slug}
                                    title={branch.title}
                                    description={`Browse ${branch.semesters.length} semesters`}
                                    meta={subjects ? `${subjects} subject${subjects === 1 ? "" : "s"}` : "Coming soon"}
                                    href={dashboardHref([course.slug, branch.slug])}
                                    tag={branch.short ?? "Branch"}
                                    color="blue"
                                />
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
