import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { MDXComponents } from "mdx/types";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { NoteCard } from "@/components/note-card";
import { EmptyState } from "@/components/empty-state";
import { resolveSlugs } from "@/lib/courses";
import { countSubjects, dashboardHref, findUnit } from "@/lib/catalog";
import { readNote } from "@/lib/notes";
import { ClientSplitViewWrapper } from "./client-wrapper";

// Notes are trusted repo content, but never allow JS expressions in them.
const MDX_OPTIONS = { blockJS: true, blockDangerousJS: true } as const;

const components: MDXComponents = {
    h1: (props) => <h1 className="text-3xl font-bold mt-8 mb-4" {...props} />,
    h2: (props) => <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
    p: (props) => <p className="leading-7 mb-4" {...props} />,
    ul: (props) => <ul className="list-disc list-inside mb-4" {...props} />,
    li: (props) => <li className="mb-1" {...props} />,
    pre: (props) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
    code: (props) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
};

interface PageProps {
    params: Promise<{ slug: string[] }>;
    searchParams: Promise<{ note?: string | string[] }>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function CoursePage(props: PageProps) {
    const { slug } = await props.params;
    const { note } = await props.searchParams;
    const activeNoteSlug = typeof note === "string" ? note : undefined;

    const node = resolveSlugs(slug);
    if (!node || node.type === "root") notFound();

    const basePath = dashboardHref(slug);

    // Note content (sliding pane) - only for subject pages with a valid ?note=
    let noteContent: React.ReactNode = null;
    let hasActiveNote = false;

    if (node.type === "subject" && activeNoteSlug) {
        const unit = findUnit(node.subject, activeNoteSlug);
        if (!unit) notFound();
        hasActiveNote = true;
        const source = readNote(unit.path);
        noteContent = source ? (
            <article className="space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">UNIT</span>
                    <span>{unit.title}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-8">{unit.title}</h1>
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <MDXRemote source={source} components={components} options={MDX_OPTIONS} />
                </div>
            </article>
        ) : (
            <EmptyState
                title="This note is not available yet"
                description="The content for this unit could not be loaded. Please try again later."
            />
        );
    }

    // Title, description, children for each level
    let title: string;
    let gridItems: React.ReactNode = null;
    let empty: React.ReactNode = null;

    if (node.type === "course") {
        title = node.course.title;
        gridItems = node.course.branches.map((branch) => (
            <NoteCard
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
                    key={sub.slug}
                    title={sub.title}
                    description={sub.units.length ? `${plural(sub.units.length, "unit")}` : "Units coming soon."}
                    meta={sub.units.length ? undefined : "Coming soon"}
                    href={dashboardHref([...slug, sub.slug])}
                    tag="Subject"
                    color="orange"
                />
            ));
        }
    } else {
        // subject
        title = node.subject.title;
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
            gridItems = node.subject.units.map((unit) => (
                <NoteCard
                    key={unit.slug}
                    title={unit.title}
                    description={unit.desc || "Open this unit"}
                    href={`${basePath}?note=${unit.slug}`}
                    tag="Unit"
                    color="purple"
                    scroll={false}
                />
            ));
        }
    }

    const breadcrumbs = (
        <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <li>
                    <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
                </li>
                {slug.map((s, i) => (
                    <li key={i} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        <Link
                            href={dashboardHref(slug.slice(0, i + 1))}
                            aria-current={i === slug.length - 1 ? "page" : undefined}
                            className="hover:text-primary capitalize"
                        >
                            {s.replace(/-/g, " ")}
                        </Link>
                    </li>
                ))}
            </ol>
        </nav>
    );

    const MainView = (
        <div className="space-y-8 animate-in fade-in duration-500 p-1">
            {breadcrumbs}

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    {node.type === "subject" ? <FileText className="w-6 h-6" aria-hidden="true" /> : <Folder className="w-6 h-6" aria-hidden="true" />}
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{title}</h1>
                    {gridItems && (
                        <p className="text-muted-foreground">
                            {node.type === "subject" ? "Select a unit to read" : "Select an item to continue"}
                        </p>
                    )}
                </div>
            </div>

            {empty ?? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{gridItems}</div>
            )}
        </div>
    );

    if (node.type === "subject") {
        return (
            <ClientSplitViewWrapper isOpen={hasActiveNote} sideContent={noteContent} basePath={basePath}>
                {MainView}
            </ClientSplitViewWrapper>
        );
    }

    return MainView;
}
