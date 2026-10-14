import React from 'react';

export default function CourseLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen">
			<div className="max-w-6xl mx-auto">
				<div>{children}</div>
			</div>
		</div>
	);
}
