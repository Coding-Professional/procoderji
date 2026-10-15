import { isRealIsoDate } from "./dates.ts";

// Curated jobs and internships.
//
// Rules this model enforces:
//  - every listing links to the employer's OFFICIAL application page (https, not a
//    link shortener), and carries a short summary in our own words (capped, so job
//    descriptions are not copied);
//  - every listing records when it was posted and when we last verified it;
//  - listings expire: past their deadline they are marked "closed", and after a
//    grace period they are archived. Listings nobody has re-verified are flagged.
// Nothing here is fetched or scraped; entries are added by hand in src/data/jobs.json.

export const JOB_CATEGORIES = [
	{ slug: "fresher", label: "Fresher" },
	{ slug: "internship", label: "Internship" },
	{ slug: "experienced", label: "Experienced" },
	{ slug: "remote", label: "Remote" },
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number]["slug"];

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export interface Job {
	id: string;
	company: string;
	title: string;
	category: JobCategory;
	employmentType: EmploymentType;
	location: { city?: string; country: string; remote: boolean };
	eligibility: {
		degrees: string[];
		/** Graduation batches/years that may apply, if the employer restricts them. */
		batches?: number[];
		minExperienceYears?: number;
		skills?: string[];
	};
	/** Short summary in our own words (max SUMMARY_MAX_CHARS). */
	summary: string;
	/** The employer's official application / careers page. */
	applyUrl: string;
	postedAt: string; // YYYY-MM-DD
	deadline?: string; // YYYY-MM-DD
	lastVerifiedAt: string; // YYYY-MM-DD
}

export interface JobsData {
	jobs: Job[];
}

export const SUMMARY_MAX_CHARS = 400;
export const CLOSING_SOON_DAYS = 7;
/** A listing not re-verified for this long is flagged as unverified. */
export const STALE_AFTER_DAYS = 30;
/** Closed listings stay visible this long after the deadline, then are archived. */
export const ARCHIVE_AFTER_DEADLINE_DAYS = 60;
/** Listings without a deadline are archived this long after they were last verified. */
export const ARCHIVE_AFTER_VERIFIED_DAYS = 90;

export type JobStatus = "open" | "closing-soon" | "unverified" | "closed";

const MS_PER_DAY = 86_400_000;
const parse = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
	return Math.round((parse(to) - parse(from)) / MS_PER_DAY);
}

/** Today's date (UTC) as YYYY-MM-DD. */
export const todayIso = (now: Date = new Date()) => now.toISOString().slice(0, 10);

/** Where a listing stands on `today`. A deadline date itself still counts as open. */
export function jobStatus(job: Job, today: string): JobStatus {
	if (job.deadline && job.deadline < today) return "closed";
	if (daysBetween(job.lastVerifiedAt, today) > STALE_AFTER_DAYS) return "unverified";
	if (job.deadline && daysBetween(today, job.deadline) <= CLOSING_SOON_DAYS) return "closing-soon";
	return "open";
}

/** Closed long enough ago (or never re-verified) that it should leave the main listing. */
export function isArchived(job: Job, today: string): boolean {
	if (job.deadline) return daysBetween(job.deadline, today) > ARCHIVE_AFTER_DEADLINE_DAYS;
	return daysBetween(job.lastVerifiedAt, today) > ARCHIVE_AFTER_VERIFIED_DAYS;
}

export interface PartitionedJobs {
	/** Open, closing soon or unverified; soonest deadline first, then newest. */
	active: Job[];
	/** Past deadline but within the grace period. Shown as "Closed", without an apply link. */
	closed: Job[];
	archived: Job[];
}

export function partitionJobs(jobs: Job[], today: string): PartitionedJobs {
	const active: Job[] = [];
	const closed: Job[] = [];
	const archived: Job[] = [];
	for (const job of jobs) {
		if (isArchived(job, today)) archived.push(job);
		else if (jobStatus(job, today) === "closed") closed.push(job);
		else active.push(job);
	}
	const byDeadline = (a: Job, b: Job) =>
		(a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31") || b.postedAt.localeCompare(a.postedAt);
	active.sort(byDeadline);
	closed.sort((a, b) => (b.deadline ?? "").localeCompare(a.deadline ?? ""));
	return { active, closed, archived };
}

// Shorteners and redirectors hide the real destination; official links only.
const BLOCKED_APPLY_HOSTS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "rebrand.ly", "cutt.ly", "is.gd", "lnkd.in", "ow.ly"];

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const validDate = isRealIsoDate;

/**
 * Structural checks for jobs.json. `today` is used to reject dates in the future.
 * Returns human-readable problems (empty when valid).
 */
export function validateJobs(jobs: Job[], today: string): string[] {
	const problems: string[] = [];
	const seen = new Set<string>();
	for (const j of jobs) {
		const id = j.id || "(no id)";
		if (!ID_RE.test(j.id)) problems.push(`${id}: invalid id`);
		if (seen.has(j.id)) problems.push(`${id}: duplicate id`);
		seen.add(j.id);
		if (!j.company?.trim()) problems.push(`${id}: empty company`);
		if (!j.title?.trim()) problems.push(`${id}: empty title`);
		if (!JOB_CATEGORIES.some((c) => c.slug === j.category)) problems.push(`${id}: unknown category "${j.category}"`);
		if (!EMPLOYMENT_TYPES.includes(j.employmentType)) problems.push(`${id}: unknown employment type "${j.employmentType}"`);
		if (!j.location?.country?.trim()) problems.push(`${id}: location.country is required`);
		if (!Array.isArray(j.eligibility?.degrees) || j.eligibility.degrees.length === 0) problems.push(`${id}: eligibility.degrees is required`);

		if (!j.summary?.trim()) problems.push(`${id}: empty summary`);
		else if (j.summary.length > SUMMARY_MAX_CHARS) problems.push(`${id}: summary is over ${SUMMARY_MAX_CHARS} characters (write it in your own words; do not copy the posting)`);

		let url: URL | null = null;
		try {
			url = new URL(j.applyUrl);
		} catch {
			problems.push(`${id}: applyUrl is not a valid URL`);
		}
		if (url) {
			if (url.protocol !== "https:") problems.push(`${id}: applyUrl must be https`);
			if (url.username || url.password) problems.push(`${id}: applyUrl must not contain credentials`);
			if (BLOCKED_APPLY_HOSTS.includes(url.hostname.toLowerCase())) problems.push(`${id}: applyUrl must be the employer's official page, not a link shortener`);
		}

		for (const k of ["postedAt", "lastVerifiedAt"] as const) {
			if (!j[k] || !validDate(j[k])) problems.push(`${id}: ${k} must be a real YYYY-MM-DD date`);
			else if (j[k] > today) problems.push(`${id}: ${k} is in the future`);
		}
		if (j.deadline !== undefined && !validDate(j.deadline)) problems.push(`${id}: deadline must be a real YYYY-MM-DD date`);
		if (validDate(j.postedAt ?? "") && validDate(j.deadline ?? "") && (j.deadline as string) < j.postedAt) problems.push(`${id}: deadline is before postedAt`);
		if (validDate(j.postedAt ?? "") && validDate(j.lastVerifiedAt ?? "") && j.lastVerifiedAt < j.postedAt) problems.push(`${id}: lastVerifiedAt is before postedAt`);
	}
	return problems;
}

/** The jobs page belongs in the sitemap only while something is open to apply for. */
export function jobsSitemapRoutes(jobs: Job[], today: string): { path: string }[] {
	return partitionJobs(jobs, today).active.length > 0 ? [{ path: "/jobs" }] : [];
}
