import * as React from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { FileText, Folder } from "lucide-react";
import { NoteCard } from "@/components/note-card";
import { EmptyState } from "@/components/empty-state";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { pageMetadata } from "@/lib/seo";
import { resolveSlugs } from "@/lib/courses";
import { breadcrumbsFor, countSubjects, dashboardHref, findUnit } from "@/lib/catalog";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/jsonld";
import { getSiteUrl } from "@/lib/site";
import { readNote } from "@/lib/notes";
import { UnitView } from "./unit-view";

interface PageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<{ note?: string | string[] }>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
    const { slug } = await params;
    const node = resolveSlugs(slug);
    if (!node || node.type === "root") return { title: "Not found", robots: { index: false } };

    const path = dashboardHref(slug);
    switch (node.type) {
        case "course":
            return pageMetadata({
                title: node.course.title,
                description: `Browse ${node.course.title} notes by branch and semester.`,
                path,
                noindex: countSubjects(node.course) === 0,
            });
        case "branch":
            return pageMetadata({
                title: node.branch.title,
                description: `${node.branch.title} notes by semester from the ProCoderJii community.`,
                path,
                noindex: countSubjects(node.branch) === 0,
            });
        case "semester":
            return pageMetadata({
                title: `${node.branch.short ?? node.branch.title} ${node.semester.title}`,
                description: `${node.branch.title} ${node.semester.title} notes and subjects.`,
                path,
                noindex: node.semester.subjects.length === 0,
            });
        case "subject":
            return pageMetadata({
                title: `${node.subject.title} - ${node.branch.short ?? node.branch.title} ${node.semester.title}`,
                description:
                    node.subject.desc ??
                    `${node.subject.title} notes for ${node.branch.title}, ${node.semester.title}${
                        node.subject.units.length ? `: ${plural(node.subject.units.length, "unit")}` : ""
                    }.`,
                path,
                noindex: node.subject.units.length === 0,
            });
        case "unit":
            return pageMetadata({
                title: `${node.unit.title} - ${node.subject.title}`,
                description:
                    node.unit.desc ?? `${node.unit.title}: notes for ${node.subject.title}, ${node.branch.title} ${node.semester.title}.`,
                path,
                // Only index a unit whose note file can actually be read.
                noindex: readNote(node.unit.path) === null,
            });
    }
}

export default async function CoursePage(props: PageProps) {
    const { slug } = await props.params;
    const { note } = await props.searchParams;

    const node = resolveSlugs(slug);
    if (!node || node.type === "root") notFound();

    const basePath = dashboardHref(slug);

    // Legacy "?note=unit-1" links now live at their own URL.
    if (node.type === "subject" && typeof note === "string") {
        if (!findUnit(node.subject, note)) notFound();
        permanentRedirect(`${basePath}/${note}`);
    }

    if (node.type === "unit") {
        const source = readNote(node.unit.path);
        if (source === null) {
            return (
                <div className="max-w-3xl mx-auto">
                    <Breadcrumbs items={breadcrumbsFor(node, slug)} />
                    <EmptyState
                        title="This note is not available yet"
                        description="The content for this unit could not be loaded. Please try again later."
                        backHref={dashboardHref(slug.slice(0, 4))}
                        backLabel="Back to units"
                    />
                </div>
            );
        }
        return <UnitView node={node} slug={slug} source={source} />;
    }

    // Title, cards and empty state for each listing level
    let title: string;
    let intro: string | undefined;
    let gridItems: React.ReactNode = null;
    let empty: React.ReactNode = null;

    if (node.type === "course") {
        title = node.course.title;
        gridItems = node.course.branches.map((branch) => (
            <NoteCard
                headingLevel={2}
                key={branch.slug}
                title={branch.title}
                description={`Browse ${branch.title} semesters`}
                meta={countSubjects(branch) ? plural(countSubjects(branch), "subject") : "Coming soon"}
                href={dashboardHref([...slug, branch.slug])}
                tag="Branch"
                color="blue"
            />
        ));
    } else if (node.type === "branch") {
        title = node.branch.title;
        gridItems = node.branch.semesters.map((sem) => (
            <NoteCard
                headingLevel={2}
                key={sem.slug}
                title={sem.title}
                description={sem.subjects.length ? `${plural(sem.subjects.length, "subject")} available` : "Notes for this semester are coming soon."}
                meta={sem.subjects.length ? undefined : "Coming soon"}
                href={dashboardHref([...slug, sem.slug])}
                tag="Semester"
                color="green"
            />
        ));
    } else if (node.type === "semester") {
        title = `${node.branch.short ?? node.branch.title} - ${node.semester.title}`;
        if (node.semester.subjects.length === 0) {
            empty = (
                <EmptyState
                    title="Notes coming soon"
                    description={`We have not published subjects for ${node.semester.title} yet. Check back soon, or tell us which subject you need.`}
                    backHref={dashboardHref(slug.slice(0, 2))}
                    backLabel="Back to semesters"
                />
            );
        } else {
            gridItems = node.semester.subjects.map((sub) => (
                <NoteCard
                    headingLevel={2}
                    key={sub.slug}
                    title={sub.title}
                    description={sub.desc ?? (sub.units.length ? plural(sub.units.length, "unit") : "Units coming soon.")}
                    meta={sub.units.length ? plural(sub.units.length, "unit") : "Coming soon"}
                    href={dashboardHref([...slug, sub.slug])}
                    tag="Subject"
                    color="orange"
                />
            ));
        }
    } else {
        // subject
        title = node.subject.title;
        intro = node.subject.desc;
        if (node.subject.units.length === 0) {
            empty = (
                <EmptyState
                    title="Units coming soon"
                    description="Notes for this subject are not published yet."
                    backHref={dashboardHref(slug.slice(0, 3))}
                    backLabel="Back to subjects"
                />
            );
        } else {
            gridItems = node.subject.units.map((unit, i) => (
                <NoteCard
                    headingLevel={2}
                    key={unit.slug}
                    title={unit.title}
                    description={unit.desc || "Open this unit"}
                    meta={`Unit ${i + 1}`}
                    href={`${basePath}/${unit.slug}`}
                    tag="Unit"
                    color="purple"
                />
            ));
        }
    }

    const crumbs = breadcrumbsFor(node, slug);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-1">
            <Breadcrumbs items={crumbs} />

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    {node.type === "subject" ? <FileText className="w-6 h-6" aria-hidden="true" /> : <Folder className="w-6 h-6" aria-hidden="true" />}
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{title}</h1>
                    {intro ? (
                        <p className="text-muted-foreground max-w-2xl">{intro}</p>
                    ) : (
                        gridItems && (
                            <p className="text-muted-foreground">
                                {node.type === "subject" ? "Select a unit to read" : "Select an item to continue"}
                            </p>
                        )
                    )}
                </div>
            </div>

            {empty ?? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{gridItems}</div>}

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd(getSiteUrl(), crumbs)) }}
            />
        </div>
    );
}
