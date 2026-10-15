import { EmailLink, H2, LegalLayout, P, UL, legalMetadata } from "@/components/legal/legal-layout";

export const metadata = legalMetadata(
    "Disclaimer",
    "Important limits on how to rely on ProCoderJii Notes.",
    "/disclaimer"
);

export default function DisclaimerPage() {
    return (
        <LegalLayout title="Disclaimer">
            <H2>Educational use only</H2>
            <P>
                The notes and guides on this site are general study aids. They are not a substitute for your
                university&apos;s prescribed textbooks, syllabus, lectures or instructions from your teachers.
            </P>

            <H2>Not affiliated with any university or exam body</H2>
            <P>
                ProCoderJii Notes is an independent project. It is not affiliated with, endorsed by, or sponsored by
                any university, board, regulator or examination authority, and the use of their names is only to
                describe the subjects and courses the notes relate to.
            </P>

            <H2>Syllabus and exam changes</H2>
            <P>
                Syllabi, schemes and exam patterns change. Always confirm the current requirements with the official
                source published by your university before you rely on anything here.
            </P>

            <H2>Accuracy</H2>
            <UL>
                <li>We take care in writing and reviewing the notes, but errors are possible.</li>
                <li>We do not guarantee that the content is complete, current or suitable for your exam.</li>
                <li>We are not responsible for marks, results or decisions that depend on it.</li>
            </UL>

            <H2>External links</H2>
            <P>
                Links to other websites are provided for convenience. We do not control those sites and are not
                responsible for their content.
            </P>

            <H2>Corrections</H2>
            <P>
                If you find a mistake, please tell us at <EmailLink /> and we will review it.
            </P>
        </LegalLayout>
    );
}
