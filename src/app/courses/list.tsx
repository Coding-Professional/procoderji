import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export interface ListItem {
	href: string;
	label: string;
}

/** Plain list page shared by the /courses/* routes, with a coming-soon state. */
export function CourseList({
	title,
	heading,
	items,
	emptyTitle,
}: {
	title: string;
	heading?: string;
	items: ListItem[];
	emptyTitle: string;
}) {
	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold mb-2">{title}</h1>
			{items.length === 0 ? (
				<div className="mt-6">
					<EmptyState title={emptyTitle} backHref="/dashboard" backLabel="Browse notes" />
				</div>
			) : (
				<>
					{heading && <h2 className="text-lg font-semibold mt-4">{heading}</h2>}
					<ul className="mt-2 space-y-2">
						{items.map((it) => (
							<li key={it.href}>
								<Link href={it.href} className="text-blue-600 hover:underline">
									{it.label}
								</Link>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
