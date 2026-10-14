import { EmailLink, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata = legalMetadata(
    "Privacy Policy",
    "How ProCoderJii Notes handles visitor data.",
    "/privacy"
);

export default function PrivacyPage() {
    return (
        <LegalLayout title="Privacy Policy">
            <P>
                This policy explains what information is handled when you visit ProCoderJii Notes (procoderji.com).
                The site is operated by <Operator />. You can reach us at <EmailLink />.
            </P>

            <H2>1. What we collect</H2>
            <P>
                The site has no user accounts, no comments, and no database of visitors. We do not ask you to register
                and we do not store the contents of any form on our own servers.
            </P>
            <UL>
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

            <H2>2. Cookies and similar technologies</H2>
            <P>
                At the time of writing, the site does not set cookies of its own, does not use browser storage to
                track you, and does not use analytics or advertising services.
            </P>

            <H2>3. Third-party content</H2>
            <P>
                The &ldquo;About&rdquo; section of the home page displays an animation that is loaded from
                lottie.host (LottieFiles). When it loads, that service receives your IP address and browser
                information, as any website you visit would. Links on this site (for example to YouTube or to
                university websites) lead to other sites that have their own privacy practices.
            </P>

            <H2>4. If this changes</H2>
            <P>
                If we add analytics, advertising (such as Google AdSense), embedded videos, a newsletter or anything
                else that collects data or sets cookies, we will update this policy first, describe the third parties
                involved, and ask for your consent where the law requires it.
            </P>

            <H2>5. Your choices and rights</H2>
            <P>
                Depending on where you live, you may have the right to ask what personal data we hold about you, to
                have it corrected or deleted, and to object to its use. We handle personal data in line with
                applicable Indian law, including the Digital Personal Data Protection Act, 2023 as it comes into
                force. To make a request, email <EmailLink />. We will respond within a reasonable time.
            </P>

            <H2>6. Children</H2>
            <P>
                The site is meant for students. We do not knowingly collect personal data from children through the
                site. If you believe a child has sent us personal data, email us and we will delete it.
            </P>

            <H2>7. Changes to this policy</H2>
            <P>
                We may update this policy. The effective date at the top shows when the current version took effect.
            </P>

            <H2>8. Contact</H2>
            <P>
                Questions about this policy: <EmailLink />
                {LEGAL.postalAddress ? <> &middot; {LEGAL.postalAddress}</> : null}.
            </P>
        </LegalLayout>
    );
}
