import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { NoteBody } from "@/components/note-body";
import { SiteShell } from "@/components/site-shell";
import { getGuides } from "@/lib/content-data";
import { categoryLabel } from "@/lib/guides";
import { articleJsonLd, breadcrumbJsonLd, jsonLdString } from "@/lib/jsonld";
import { LEGAL } from "@/lib/legal";
import { readNote } from "@/lib/notes";
import { formatIsoDate, readingTimeMinutes } from "@/lib/reading";
import { pageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site";

// Only registered guides exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
    return getGuides().map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const guide = getGuides().find((g) => g.slug === slug);
    if (!guide) return { title: "Not found", robots: { index: false } };
    return pageMetadata({
        title: guide.title,
        description: guide.description,
        path: `/guides/${guide.slug}`,
        noindex: readNote(guide.path) === null,
    });
}

export default async function GuidePage({ params }: Props) {
    const { slug } = await params;
    const guide = getGuides().find((g) => g.slug === slug);
    if (!guide) notFound();

    const path = `/guides/${guide.slug}`;
    const crumbs = [
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title, path },
    ];
    const source = readNote(guide.path);

    if (source === null) {
        return (
            <SiteShell>
                <Breadcrumbs items={crumbs} />
                <EmptyState
                    title="This guide is not available yet"
                    description="The content for this guide could not be loaded. Please try again later."
                    backHref="/guides"
                    backLabel="All guides"
                />
            </SiteShell>
        );
    }

    const siteUrl = getSiteUrl();
    const updated = formatIsoDate(guide.updatedAt ?? guide.addedAt);
    const jsonLd = [
        breadcrumbJsonLd(siteUrl, crumbs),
        articleJsonLd(siteUrl, {
            headline: guide.title,
            description: guide.description,
            path,
            authorName: LEGAL.operatorName ?? "ProCoderJii",
            datePublished: guide.addedAt,
            dateModified: guide.updatedAt ?? guide.addedAt,
        }),
    ];

    return (
        <SiteShell width="max-w-3xl">
            <Breadcrumbs items={crumbs} />
            <article>
                <header className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary">{categoryLabel(guide.category)}</p>
                    <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">{guide.title}</h1>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4" aria-hidden="true" /> {readingTimeMinutes(source)} min read
                        </span>
                        <span className="capitalize">{guide.level}</span>
                        {updated && <span>Updated {updated}</span>}
                    </p>
                </header>
                <NoteBody source={source} />
            </article>
            {jsonLd.map((data, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
            ))}
        </SiteShell>
    );
}
