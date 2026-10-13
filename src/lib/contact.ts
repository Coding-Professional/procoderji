export const CONTACT_EMAIL = "procoderji@gmail.com";

export interface ContactFields {
	name: string;
	email: string;
	subject: string;
	message: string;
}

const MAX_SUBJECT = 150;
const MAX_BODY = 1500; // keeps the mailto: URL within what mail clients accept

// Header values must be single-line: strip CR/LF and other control characters.
const oneLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

/** Build a mailto: URL that opens the visitor's email app with a pre-filled message. */
export function buildMailto(fields: ContactFields, to: string = CONTACT_EMAIL): string {
	const subject = oneLine(fields.subject).slice(0, MAX_SUBJECT) || "Notes request";
	const body = [
		`Name: ${oneLine(fields.name)}`,
		`Email: ${oneLine(fields.email)}`,
		"",
		fields.message.replace(/\r\n?/g, "\n").trim(),
	]
		.join("\n")
		.slice(0, MAX_BODY);

	return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
