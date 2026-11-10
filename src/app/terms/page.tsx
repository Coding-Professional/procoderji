import { EmailLink, Fill, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";

export const metadata = legalMetadata(
    "Terms of Use",
    "Review the terms for using ProCoderJii Notes, including acceptable use, ownership of study material, and service limitations.",
    "/terms"
);

export default function TermsPage() {
    return (
        <LegalLayout title="Terms of Use">
            <P>
                By using ProCoderJii Notes (procoderji.com), operated by <Operator />, you agree to
                these terms. If you do not agree, please do not use the site.
            </P>

            <H2>1. What the site is</H2>
            <P>
                ProCoderJii Notes provides study notes and related learning material for engineering students,
                alongside the ProCoderJii YouTube channel. It is provided for general educational use.
            </P>

            <H2>2. Ownership of content</H2>
            <P>
                The public project repository is licensed under the MIT License, with separate notices for
                third-party material. Reuse of source code and repository content follows that license and any
                applicable file-specific notices. If a learning resource states a separate license, follow its
                stated terms. The repository license is available at{" "}
                <a href="https://github.com/procoderji-com/procoderji/blob/main/LICENSE" className="underline">GitHub</a>.
            </P>
            <P>
                Names, logos and materials belonging to universities, exam bodies, YouTube, Google and other third
                parties belong to their owners. Where official syllabi or question papers exist, we link to the
                official source and do not claim them as ours.
            </P>

            <H2>3. Acceptable use</H2>
            <UL>
                <li>Do not attempt to disrupt, overload or gain unauthorised access to the site.</li>
                <li>Do not use automated tools to copy the site&apos;s content in bulk.</li>
                <li>Do not use the site for anything unlawful.</li>
            </UL>

            <H2>4. Accuracy and no warranty</H2>
            <P>
                We try to keep the content accurate, but it may contain mistakes or become out of date, for example
                when a university changes its syllabus. The site and its content are provided &ldquo;as is&rdquo;
                without warranties of any kind. See also the Disclaimer.
            </P>

            <H2>5. Links to other sites</H2>
            <P>
                The site may link to websites we do not control. We are not responsible for their content or practices.
            </P>

            <H2>6. Limitation of liability</H2>
            <P>
                To the extent allowed by law, we are not liable for any loss arising from your use of, or inability
                to use, the site or its content, including loss from relying on the notes in an examination.
            </P>

            <H2>7. Copyright complaints</H2>
            <P>
                If you believe content on the site infringes your rights, follow the steps on the Copyright &amp;
                Takedown page.
            </P>

            <H2>8. Changes and governing law</H2>
            <P>
                We may change these terms; the effective date at the top shows the current version. These terms are
                governed by the laws of <Fill field="governingLaw" />. Subject to any rights you have under law that
                cannot be limited, the courts at <Fill field="courtsLocation" /> will have jurisdiction over any
                dispute arising from them.
            </P>

            <H2>9. Contact</H2>
            <P>
                Questions about these terms: <EmailLink />
            </P>
        </LegalLayout>
    );
}
