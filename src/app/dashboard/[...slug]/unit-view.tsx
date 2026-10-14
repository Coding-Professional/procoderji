import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { mdxComponents } from "@/components/mdx-components";
import { breadcrumbsFor, dashboardHref, siblingUnits, type CatalogNode } from "@/lib/catalog";
import { articleJsonLd, breadcrumbJsonLd, jsonLdString } from "@/lib/jsonld";
import { LEGAL } from "@/lib/legal";
import { SAFE_MDX_OPTIONS } from "@/lib/mdx-safe";
import { formatIsoDate, readingTimeMinutes } from "@/lib/reading";
import { getSiteUrl } from "@/lib/site";

type UnitNode = Extract<CatalogNode, { type: "unit" }>;

export function UnitView({ node, slug, source }: { node: UnitNode; slug: string[]; source: string }) {
    const { subject, unit } = node;
    const siteUrl = getSiteUrl();
    const crumbs = breadcrumbsFor(node, slug);
    const path = dashboardHref(slug);
    const { prev, next } = siblingUnits(subject, unit.slug);
    const updated = formatIsoDate(unit.updatedAt ?? unit.addedAt);
    const minutes = readingTimeMinutes(source);
    const unitHref = (slugOfUnit: string) => dashboardHref([...slug.slice(0, 4), slugOfUnit]);

    const description = unit.desc ?? `${unit.title}: notes for ${subject.title}, ${node.branch.title} ${node.semester.title}.`;
    const jsonLd = [
        breadcrumbJsonLd(siteUrl, crumbs),
        articleJsonLd(siteUrl, {
            headline: unit.title,
            description,
            path,
            authorName: LEGAL.operatorName ?? "ProCoderJii",
            datePublished: unit.addedAt,
            dateModified: unit.updatedAt ?? unit.addedAt,
        }),
    ];

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
            <Breadcrumbs items={crumbs} />

            <article>
                <header className="mb-8">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary">{subject.title}</p>
                    <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight">{unit.title}</h1>
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="w-4 h-4" aria-hidden="true" /> {minutes} min read
                        </span>
                        {updated && <span>Updated {updated}</span>}
                    </p>
                </header>

                <div className="rounded-2xl border border-border bg-white/90 p-6 sm:p-10">
                    <MDXRemote source={source} components={mdxComponents} options={SAFE_MDX_OPTIONS} />
                </div>
            </article>

            <nav aria-label="Unit navigation" className="mt-8 grid gap-4 sm:grid-cols-2">
                {prev ? (
                    <Link href={unitHref(prev.slug)} rel="prev" className="rounded-xl border border-border bg-white/80 p-4 hover:border-primary/50">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Previous
                        </span>
                        <span className="mt-1 block font-semibold">{prev.title}</span>
                    </Link>
                ) : (
                    <span />
                )}
                {next && (
                    <Link href={unitHref(next.slug)} rel="next" className="rounded-xl border border-border bg-white/80 p-4 text-right hover:border-primary/50 sm:col-start-2">
                        <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                            Next <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <span className="mt-1 block font-semibold">{next.title}</span>
                    </Link>
                )}
            </nav>

            <p className="mt-6 text-center text-sm">
                <Link href={dashboardHref(slug.slice(0, 4))} className="underline text-muted-foreground hover:text-foreground">
                    Back to all units in {subject.title}
                </Link>
            </p>

            {jsonLd.map((data, i) => (
                <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
            ))}
        </div>
    );
}
