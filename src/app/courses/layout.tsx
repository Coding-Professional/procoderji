import type { Metadata } from "next";

// /courses/* is a plain duplicate of the /dashboard reader; keep it out of search
// results so only the dashboard URLs compete for ranking.
export const metadata: Metadata = {
	robots: { index: false, follow: true },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
	return <main id="main-content">{children}</main>;
}
