import React from 'react';
import type { Metadata } from 'next';

// Placeholder page: keep it out of search results until it has real content.
export const metadata: Metadata = { title: 'About', robots: { index: false, follow: true } };

export default function AboutPage() {
	return (
		<div className="p-6">
			<h1 className="text-2xl font-bold">About</h1>
			<p className="mt-2 text-gray-700">University Notes Platform (V1) — static MDX notes reader.</p>
		</div>
	);
}
