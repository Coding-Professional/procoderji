import { EmailLink, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";

export const metadata = legalMetadata(
    "About",
    "What ProCoderJii Notes is, who runs it and how its content is made.",
    "/about"
);

export default function AboutPage() {
    return (
        <LegalLayout title="About ProCoderJii Notes">
            <P>
                ProCoderJii Notes is a study site that goes with the ProCoderJii YouTube channel. It is operated by{" "}
                <Operator />. The aim is to give engineering students clear, unit-wise notes
                organised by branch, semester and subject.
            </P>

            <H2>Where the project stands</H2>
            <P>
                The branch and semester structure is in place, and notes are being added subject by subject. Semesters
                that have no published notes yet are marked &ldquo;Coming soon&rdquo; and are not listed in search
                results. We would rather publish a small amount of good material than a large amount of thin pages.
            </P>

            <H2>How content is made</H2>
            <UL>
                <li>Notes are written and reviewed by the ProCoderJii team before they are published.</li>
                <li>Where an official syllabus or question paper exists, we link to the university&apos;s own page instead of copying it.</li>
                <li>We do not republish other people&apos;s notes, papers or PDFs without permission.</li>
            </UL>

            <H2>Corrections and requests</H2>
            <P>
                Found a mistake, or want a subject covered? Email <EmailLink />. See the Disclaimer for the limits of
                what these notes can be relied on for.
            </P>
        </LegalLayout>
    );
}
