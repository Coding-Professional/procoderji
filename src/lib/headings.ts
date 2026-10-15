/**
 * Notes and guides are rendered under a page that already has an <h1> (the note
 * title), so Markdown headings are demoted by one level: "#" becomes <h2>, "##"
 * becomes <h3>, and so on, never going below <h6>.
 */
export type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6";

export function demoteHeading(markdownLevel: 1 | 2 | 3 | 4 | 5 | 6): HeadingTag {
	return `h${Math.min(markdownLevel + 1, 6)}` as HeadingTag;
}
