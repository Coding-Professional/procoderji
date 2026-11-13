import { EmailLink, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";
import { PORTFOLIO_MINIMUM_AGE, PORTFOLIO_POLICY_VERSION } from "@/features/portfolio/policy";
import { LEGAL, policyEffectiveDates } from "@/lib/legal";
import { getYoutubeChannelId } from "@/lib/youtube";

export const metadata = legalMetadata(
    "Privacy Policy",
    "How ProCoderJii handles learning accounts, practice history, private portfolio drafts, and published portfolios.",
    "/privacy"
);

export default function PrivacyPage() {
    return (
        <LegalLayout title="Privacy Policy" effectiveDate={policyEffectiveDates["/privacy"]}>
            <P>
                This policy explains what information is handled when you use ProCoderJii (procoderji.com).
                The site is operated by <Operator />. You can reach us at <EmailLink />.
            </P>

            <H2>1. What we collect</H2>
            <P>
                You can use free practice without registering. Completed guest sessions are saved in your browser.
                When optional learning accounts are enabled, signing in lets you sync your practice history across devices.
            </P>
            <UL>
                <li>
                    <strong>Learning progress.</strong> We save the questions you attempted, your selected answers,
                    completion times, and session duration. Your workspace displays up to 100 recent sessions.
                    Guest history stays on your device. Signed-in history is stored in the learning service&apos;s
                    database and is associated with your account. Guest history moves to an account only when you
                    explicitly import it.
                </li>
                <li>
                    <strong>Optional Google sign-in.</strong> Google confirms your identity and shares your account
                    identifier, basic profile name, and email address with our learning service. We use these to
                    create and maintain your learning account. ProCoderJii does not receive your Google password.
                    We do not ask for your college, phone number, or resume to use practice.
                </li>
                <li>
                    <strong>Private portfolio drafts.</strong> When you explicitly save a draft while signed in,
                    we store it in the learning service&apos;s database with your account and any username you claim.
                    Drafts can contain your chosen name, headline, about text, skills, projects, education,
                    experience, achievements, links, optional public email address, and theme. A guest can try
                    the form, but that draft stays only in the open page and is lost when the page is left or
                    the account changes.
                </li>
                <li>
                    <strong>Publishing confirmation.</strong> Before publishing, you must confirm that you are
                    at least {PORTFOLIO_MINIMUM_AGE} and have read the portfolio Terms and Privacy Policy. We
                    privately store the accepted policy version (currently {PORTFOLIO_POLICY_VERSION}) and the
                    confirmation time with your portfolio. We do not collect a date of birth or identity
                    document for this step; it is your declaration, not independent age verification.
                </li>
                <li>
                    <strong>Messages you send us.</strong> The contact form on the home page does not send anything
                    by itself. It opens your own email app with a message addressed to {LEGAL.contactEmail}. If you
                    choose to send it, we receive the name, email address and message you wrote, through your email
                    provider. We use them only to reply to you and to improve the site, and we keep them for as long as
                    needed for that purpose.
                </li>
                <li>
                    <strong>Technical data processed by our hosting provider.</strong> The site is delivered by a
                    hosting provider (currently Vercel Inc.). When you load a page, the provider processes technical
                    data such as your IP address, browser and device type, the page requested and the time, in order to
                    deliver the site, keep it secure and diagnose problems.
                </li>
            </UL>

            <H2>2. What publishing makes public</H2>
            <P>
                Saving a draft does not publish it. When you choose Publish, we save a separate public copy of
                the portfolio details and search preference you chose. Anyone who knows its /u/username address
                can read that copy without an account. This includes any email address, education, experience,
                project details, and links you put in it. Your Google sign-in email is not added to the public
                page automatically. Later edits to your draft stay private until you publish again.
            </P>
            <P>
                Search visibility is off by default: the page asks search engines not to index it and is left
                out of our sitemap. You can opt in when publishing. This setting does not make the address
                private or prevent visitors, search engines, or other services from copying its contents.
                Search engines may take time to update, and we cannot recall copies held by third parties.
                Share only information you want public; do not include another person&apos;s private information.
            </P>
            <P>
                The portfolio has no fields for phone numbers, postal addresses, or dates of birth, and no
                photo or other uploaded-file storage. Its avatar uses initials. Free-text fields are still
                public if you publish them, so avoid putting sensitive information there.
            </P>

            <H2>3. Markdown import</H2>
            <P>
                You can paste Markdown or select a UTF-8 text file up to 50 KiB to fill the form. Parsing happens
                in your browser; the file itself is not uploaded, stored, or rendered as a public page. Review
                the imported fields before explicitly saving a private draft or publishing. We do not send
                your text to an AI service. If you use your own AI tool to prepare it, that tool has its own
                data practices.
            </P>

            <H2>4. Cookies and similar technologies</H2>
            <P>
                Browser storage keeps your learning progress on this device. If you sign in, essential authentication
                cookies maintain your session, and a request-verification cookie protects account updates. These features are used to provide the learning service. The site does
                not currently use analytics or advertising services.
            </P>

            <H2>5. Third-party content</H2>
            <P>
                Interface fonts and graphics are served by this site.{" "}
                {getYoutubeChannelId() &&
                    "The home page also shows thumbnails of our latest YouTube videos, which are loaded from YouTube's image servers (i.ytimg.com, operated by Google); that service receives your IP address and browser information when they load. Clicking a video takes you to YouTube, which has its own privacy policy. "}
                Links on this site (for example to YouTube or to
                university websites) lead to other sites that have their own privacy practices.
            </P>

            <H2>6. Retention, unpublishing, and deletion</H2>
            <P>
                Guest history remains in your browser until you delete it, clear browser data, or older sessions fall
                outside the 100-session limit. Cloud practice history keeps the most recent 100 sessions per account;
                older sessions are removed as new sessions are synced. The Account &amp; data page lets you export
                the practice history currently visible in your workspace and delete practice progress. Cloud
                deletion resets cached account history on other devices when they next sync. Clearing practice
                history does not delete a portfolio or your Google sign-in account.
            </P>
            <P>
                Your saved portfolio draft and current public copy remain until you delete the portfolio or
                request removal. Unpublish removes public access while keeping your private draft and username.
                New requests to the site no longer receive the published page after unpublishing, deletion,
                or operator suspension. Published copies can remain in an internal cache for up to one hour,
                but each new page request checks that the portfolio is still published before serving a cached
                copy. Copies already saved outside the site may remain.
            </P>
            <P>
                Delete portfolio in the editor removes the saved draft, current public copy, and username claim.
                A claimed username cannot be changed while that portfolio exists. Suspended portfolios cannot
                be deleted and recreated through the editor to bypass moderation; contact <EmailLink /> for
                a review or a data-removal request. Account deletion is currently handled by contacting us,
                rather than an account-deletion button. To request removal of the sign-in account and associated
                portfolio or other data, write from the email address used for that account.
            </P>

            <H2>7. Reports and moderation</H2>
            <P>
                The report link on a public portfolio opens your email app with the page address filled in.
                Nothing is sent until you send the email. We receive the report and any details you include
                through your email provider and use them to investigate and reply. The operator can suspend
                a portfolio so it is no longer public. Restoring a suspended portfolio returns it to a private
                draft; the student must confirm eligibility and publish again to make it public.
            </P>

            <H2>8. Future changes</H2>
            <P>
                If we add analytics, advertising (such as Google AdSense), embedded videos, a newsletter or anything
                else that collects data or sets cookies, we will update this policy first, describe the third parties
                involved, and ask for your consent where the law requires it.
            </P>

            <H2>9. Your choices and rights</H2>
            <P>
                Depending on where you live, you may have the right to ask what personal data we hold about you, to
                have it corrected or deleted, and to object to its use. We handle personal data in line with
                applicable Indian law, including the Digital Personal Data Protection Act, 2023 as it comes into
                force. To make a request, email <EmailLink />. We will respond within a reasonable time.
            </P>

            <H2>10. Age requirement for public portfolios</H2>
            <P>
                Public portfolio publishing is available only to people aged {PORTFOLIO_MINIMUM_AGE} or older
                under our product policy. Guest practice does not require an account or a portfolio. We rely
                on the publishing confirmation described above. If you believe an underage person has published
                a portfolio or sent us personal information, contact <EmailLink /> so we can investigate and
                remove the information where appropriate.
            </P>

            <H2>11. Changes to this policy</H2>
            <P>
                We may update this policy. The effective date at the top shows when the current version took effect.
            </P>

            <H2>12. Contact</H2>
            <P>
                Questions about this policy: <EmailLink />
                {LEGAL.postalAddress ? <> &middot; {LEGAL.postalAddress}</> : null}.
            </P>
        </LegalLayout>
    );
}
