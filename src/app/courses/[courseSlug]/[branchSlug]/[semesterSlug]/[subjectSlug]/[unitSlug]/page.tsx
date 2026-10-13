import { notFound } from "next/navigation";
import SplitReader from "@/app/components/Reader/SplitReader";
import { EmptyState } from "@/components/empty-state";
import { catalog, resolveSlugs } from "@/lib/courses";
import { findUnit } from "@/lib/catalog";
import { readNote } from "@/lib/notes";

type Params = {
	courseSlug: string;
	branchSlug: string;
	semesterSlug: string;
	subjectSlug: string;
	unitSlug: string;
};

export async function generateStaticParams() {
	const out: Params[] = [];
	for (const c of catalog.courses)
		for (const b of c.branches)
			for (const s of b.semesters)
				for (const su of s.subjects)
					for (const u of su.units)
						out.push({
							courseSlug: c.slug,
							branchSlug: b.slug,
							semesterSlug: s.slug,
							subjectSlug: su.slug,
							unitSlug: u.slug,
						});
	return out;
}

export default async function Page({ params }: { params: Promise<Params> }) {
	const { courseSlug, branchSlug, semesterSlug, subjectSlug, unitSlug } = await params;
	const node = resolveSlugs([courseSlug, branchSlug, semesterSlug, subjectSlug]);
	if (!node || node.type !== "subject") notFound();
	const unit = findUnit(node.subject, unitSlug);
	if (!unit) notFound();

	const mdx = readNote(unit.path);
	if (mdx === null) {
		return (
			<div className="p-6">
				<EmptyState title="This note is not available yet" backHref="/dashboard" backLabel="Browse notes" />
			</div>
		);
	}

	return (
		<div className="h-[calc(100vh-4rem)]">
			<header className="p-4 border-b">
				<h1 className="text-xl font-semibold">{unit.title}</h1>
			</header>
			<SplitReader mdx={mdx} />
		</div>
	);
}
