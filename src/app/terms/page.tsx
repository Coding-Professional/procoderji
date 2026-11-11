import { EmailLink, Fill, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";
import { PORTFOLIO_MINIMUM_AGE, PORTFOLIO_POLICY_VERSION } from "@/features/portfolio/policy";
import { policyEffectiveDates } from "@/lib/legal";

export const metadata = legalMetadata(
    "Terms of Use",
    "Terms for ProCoderJii learning resources and student portfolios, including publishing, content ownership, and moderation.",
    "/terms"
);

export default function TermsPage() {
    return (
        <LegalLayout title="Terms of Use" effectiveDate={policyEffectiveDates["/terms"]}>
            <P>
                By using ProCoderJii (procoderji.com), operated by <Operator />, you agree to
                these terms. If you do not agree, please do not use the site.
            </P>

            <H2>1. What the site is</H2>
            <P>
                ProCoderJii provides study notes, placement practice, learning accounts, and optional student
                portfolios, alongside the ProCoderJii YouTube channel. It is provided for general educational
                use. A portfolio is a way to present your work; it does not guarantee employment or recruitment.
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
            <P>
                You retain ownership of the material you put in your portfolio. Publishing a portfolio does not
                place your personal information or portfolio content under the repository&apos;s MIT License.
                You give the operator permission to store and process your draft to provide the service and,
                when you choose to publish, display your chosen public copy at its portfolio address. This
                permission is limited to operating the portfolio service in accordance with your publishing
                choices and the Privacy Policy. You must have the rights or permission needed for what you submit.
            </P>

            <H2>3. Portfolio publishing and your choices</H2>
            <P>
                You must be at least {PORTFOLIO_MINIMUM_AGE} to publish a public portfolio. Publishing requires
                Google sign-in, a username claim, and your confirmation that you meet this age requirement and
                have read the portfolio Terms and Privacy Policy. We record the accepted policy version
                (currently {PORTFOLIO_POLICY_VERSION}) and confirmation time. This is a self-declaration;
                we do not collect a date of birth or independently verify your age through this step.
            </P>
            <P>
                One portfolio is available per account. Your username stays fixed while that portfolio exists,
                so choose it carefully before sharing its /u/username address. Saving a draft keeps it private.
                Publishing creates a public copy, and later draft edits do not change that copy until you
                publish again. Anyone with the address can view a published portfolio. Search indexing is
                off by default and can be enabled when publishing; it is not an access restriction.
            </P>
            <P>
                Unpublish hides the public page and keeps your draft and username. Delete portfolio removes
                the saved draft, current public copy, and username claim. Search engines and other third parties
                may keep copies after you unpublish or delete. Clearing practice history does not delete your
                portfolio. Contact <EmailLink /> to request deletion of your sign-in account and associated data.
            </P>

            <H2>4. Acceptable use</H2>
            <UL>
                <li>Do not attempt to disrupt, overload or gain unauthorised access to the site.</li>
                <li>Do not impersonate another person or organisation or misrepresent the work you have done.</li>
                <li>Do not publish phishing, scams, malicious links, harassment, or unlawful content.</li>
                <li>Do not infringe copyright or publish another person&apos;s private information without permission.</li>
                <li>Do not collect student contact details in bulk for spam or other abuse.</li>
                <li>Do not use the site for anything unlawful.</li>
            </UL>

            <H2>5. Reports and suspension</H2>
            <P>
                Use Report this page on a portfolio, or email <EmailLink /> with the page address and the
                reason for your report. The report link only prepares a message in your own email app.
                The operator reviews reports and may suspend a portfolio that violates these terms or puts
                students or the service at risk. Suspension hides the public page and prevents republishing
                or deleting and recreating the portfolio through the editor to evade that decision.
            </P>
            <P>
                Contact the operator to request a review of a suspension or removal of your data. If the
                operator restores a suspended portfolio, it returns to a private draft. Restoration does
                not publish it automatically; you must confirm eligibility and publish again.
            </P>

            <H2>6. Accuracy and no warranty</H2>
            <P>
                We try to keep the content accurate, but it may contain mistakes or become out of date, for example
                when a university changes its syllabus. The site and its content are provided &ldquo;as is&rdquo;
                without warranties of any kind. See also the Disclaimer.
            </P>

            <H2>7. Links to other sites</H2>
            <P>
                The site may link to websites we do not control. We are not responsible for their content or practices.
            </P>

            <H2>8. Limitation of liability</H2>
            <P>
                To the extent allowed by law, we are not liable for any loss arising from your use of, or inability
                to use, the site or its content, including loss from relying on the notes in an examination.
            </P>

            <H2>9. Copyright complaints</H2>
            <P>
                If you believe content on the site infringes your rights, follow the steps on the Copyright &amp;
                Takedown page.
            </P>

            <H2>10. Changes and governing law</H2>
            <P>
                We may change these terms; the effective date at the top shows the current version. These terms are
                governed by the laws of <Fill field="governingLaw" />. Subject to any rights you have under law that
                cannot be limited, the courts at <Fill field="courtsLocation" /> will have jurisdiction over any
                dispute arising from them.
            </P>

            <H2>11. Contact</H2>
            <P>
                Questions about these terms: <EmailLink />
            </P>
        </LegalLayout>
    );
}
