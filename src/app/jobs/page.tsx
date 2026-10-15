import { ExternalLink, MapPin } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmptyState } from "@/components/empty-state";
import { SiteShell } from "@/components/site-shell";
import { getJobs } from "@/lib/content-data";
import { JOB_CATEGORIES, jobStatus, partitionJobs, todayIso, type Job, type JobStatus } from "@/lib/jobs";
import { formatIsoDate } from "@/lib/reading";
import { pageMetadata } from "@/lib/seo";

// Re-render daily so deadlines and "last verified" ages stay accurate without a redeploy.
export const revalidate = 86400;

export function generateMetadata() {
    const { active } = partitionJobs(getJobs(), todayIso());
    return pageMetadata({
        title: "Jobs and internships",
        description: "Hand-picked fresher, internship and remote openings with links to the employer's official application page.",
        path: "/jobs",
        // Nothing open to apply for: keep the page out of search results.
        noindex: active.length === 0,
    });
}

const BADGE: Record<JobStatus, { label: string; className: string }> = {
    open: { label: "Open", className: "border-green-300 bg-green-50 text-green-800" },
    "closing-soon": { label: "Closing soon", className: "border-amber-300 bg-amber-50 text-amber-900" },
    unverified: { label: "Not recently verified", className: "border-gray-300 bg-gray-100 text-gray-700" },
    closed: { label: "Closed", className: "border-gray-300 bg-gray-100 text-gray-600" },
};

function locationText(job: Job) {
    const place = [job.location.city, job.location.country].filter(Boolean).join(", ");
    return job.location.remote ? `${place} (remote)` : place;
}

function JobCard({ job, status }: { job: Job; status: JobStatus }) {
    const badge = BADGE[status];
    const posted = formatIsoDate(job.postedAt);
    const deadline = formatIsoDate(job.deadline);
    const verified = formatIsoDate(job.lastVerifiedAt);
    const categoryLabel = JOB_CATEGORIES.find((c) => c.slug === job.category)?.label ?? job.category;

    return (
        <li className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-500">{job.company}</p>
                    <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
            </div>

            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" aria-hidden="true" /> {locationText(job)}
                </span>
                <span>{categoryLabel}</span>
                <span className="capitalize">{job.employmentType}</span>
            </p>

            <p className="mt-3 text-gray-700">{job.summary}</p>

            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-gray-600 sm:grid-cols-2">
                <div>
                    <dt className="inline font-semibold">Eligibility: </dt>
                    <dd className="inline">
                        {[
                            job.eligibility.degrees.join(", "),
                            job.eligibility.batches?.length ? `batch ${job.eligibility.batches.join(", ")}` : null,
                            job.eligibility.minExperienceYears ? `${job.eligibility.minExperienceYears}+ yrs experience` : null,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </dd>
                </div>
                {job.eligibility.skills?.length ? (
                    <div>
                        <dt className="inline font-semibold">Skills: </dt>
                        <dd className="inline">{job.eligibility.skills.join(", ")}</dd>
                    </div>
                ) : null}
                <div>
                    <dt className="inline font-semibold">Posted: </dt>
                    <dd className="inline">{posted}</dd>
                </div>
                <div>
                    <dt className="inline font-semibold">Deadline: </dt>
                    <dd className="inline">{deadline ?? "Not stated"}</dd>
                </div>
                <div>
                    <dt className="inline font-semibold">Last verified: </dt>
                    <dd className="inline">{verified}</dd>
                </div>
            </dl>

            {status === "closed" ? (
                <p className="mt-4 text-sm font-semibold text-gray-500">Applications have closed.</p>
            ) : (
                <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                    Apply on the official site <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">for {job.title} at {job.company} (opens in a new tab)</span>
                </a>
            )}
        </li>
    );
}

export default function JobsPage() {
    const today = todayIso();
    const { active, closed } = partitionJobs(getJobs(), today);

    return (
        <SiteShell>
            <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Jobs", path: "/jobs" }]} />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">Jobs and internships</h1>
            <p className="mt-2 mb-6 max-w-2xl text-gray-600">
                Openings we have checked by hand. Each one links to the employer&apos;s own application page.
            </p>

            <aside aria-label="How to use this list" className="mb-8 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-gray-800">
                <p className="font-semibold">Before you apply</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Deadlines and requirements can change. Confirm everything on the employer&apos;s website.</li>
                    <li>Genuine employers do not ask candidates to pay. Apply only through the employer&apos;s official site.</li>
                    <li>We are not recruiters and do not guarantee any outcome.</li>
                </ul>
            </aside>

            {active.length === 0 && closed.length === 0 ? (
                <EmptyState
                    title="No openings listed right now"
                    description="We only list openings we have checked ourselves. Check back soon."
                    backHref="/dashboard"
                    backLabel="Browse notes"
                />
            ) : (
                <>
                    {active.length === 0 ? (
                        <p className="mb-8 text-gray-600">There are no open listings at the moment.</p>
                    ) : (
                        <section aria-labelledby="open-jobs" className="mb-10">
                            <h2 id="open-jobs" className="mb-4 text-xl font-bold text-gray-900">
                                Open now ({active.length})
                            </h2>
                            <ul className="space-y-4">
                                {active.map((job) => (
                                    <JobCard key={job.id} job={job} status={jobStatus(job, today)} />
                                ))}
                            </ul>
                        </section>
                    )}
                    {closed.length > 0 && (
                        <section aria-labelledby="closed-jobs" className="mb-10">
                            <h2 id="closed-jobs" className="mb-4 text-xl font-bold text-gray-900">
                                Recently closed
                            </h2>
                            <ul className="space-y-4 opacity-80">
                                {closed.map((job) => (
                                    <JobCard key={job.id} job={job} status="closed" />
                                ))}
                            </ul>
                        </section>
                    )}
                </>
            )}
        </SiteShell>
    );
}
