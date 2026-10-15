import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { NoteCard } from "@/components/note-card";
import { SiteShell } from "@/components/site-shell";
import { getGuides } from "@/lib/content-data";
import { GUIDE_CATEGORIES } from "@/lib/guides";
import { formatIsoDate } from "@/lib/reading";
import { pageMetadata } from "@/lib/seo";

const guides = getGuides();

export const metadata = pageMetadata({
    title: "Guides",
    description: "Original guides on interview preparation, DSA, system design, resumes, GitHub and developer tools.",
    path: "/guides",
    // Keep the index out of search results until there is something on it.
    noindex: guides.length === 0,
});

const LEVEL_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export default function GuidesPage() {
    const groups = GUIDE_CATEGORIES.map((c) => ({ ...c, items: guides.filter((g) => g.category === c.slug) })).filter(
        (c) => c.items.length > 0
    );

    return (
        <SiteShell>
            <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]} />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Guides</h1>
            <p className="mt-2 mb-8 max-w-2xl text-gray-600">
                Original guides written and reviewed by the ProCoderJii team.
            </p>

            {groups.length === 0 ? (
                <EmptyState
                    title="Guides are coming soon"
                    description="We are writing guides on interviews, DSA, system design, resumes and developer tools. Tell us what would help you most."
                    backHref="/dashboard"
                    backLabel="Browse notes"
                />
            ) : (
                groups.map((group) => (
                    <section key={group.slug} aria-labelledby={`cat-${group.slug}`} className="mb-10">
                        <h2 id={`cat-${group.slug}`} className="mb-4 text-xl font-bold text-gray-900">
                            {group.label}
                        </h2>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {group.items.map((g) => {
                                const date = formatIsoDate(g.updatedAt ?? g.addedAt);
                                return (
                                    <NoteCard
                                        key={g.slug}
                                        title={g.title}
                                        description={g.description}
                                        meta={[LEVEL_LABEL[g.level], date && `Updated ${date}`].filter(Boolean).join(" · ")}
                                        href={`/guides/${g.slug}`}
                                        tag={group.label}
                                        color="green"
                                    />
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </SiteShell>
    );
}
