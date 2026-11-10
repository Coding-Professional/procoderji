import { EmailLink, H2, LegalLayout, Operator, P, UL, legalMetadata } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/legal";
import { getYoutubeChannelId } from "@/lib/youtube";

export const metadata = legalMetadata(
    "Privacy Policy",
    "How ProCoderJii Notes handles visitor data.",
    "/privacy"
);

export default function PrivacyPage() {
    return (
        <LegalLayout title="Privacy Policy">
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
                Browser storage keeps your learning progress on this device. If you sign in, essential authentication
                cookies maintain your session, and a request-verification cookie protects account updates. These features are used to provide the learning service. The site does
                not currently use analytics or advertising services.
            </P>

            <H2>3. Third-party content</H2>
            <P>
                The &ldquo;About&rdquo; section of the home page displays an animation. The animation file is
                loaded from lottie.host (LottieFiles) and the player&apos;s WebAssembly file is loaded from the
                jsDelivr content-delivery network (cdn.jsdelivr.net). When they load, those services receive your
                IP address and browser information, as any website you visit would.{" "}
                {getYoutubeChannelId() &&
                    "The home page also shows thumbnails of our latest YouTube videos, which are loaded from YouTube's image servers (i.ytimg.com, operated by Google); that service receives your IP address and browser information when they load. Clicking a video takes you to YouTube, which has its own privacy policy. "}
                Links on this site (for example to YouTube or to
                university websites) lead to other sites that have their own privacy practices.
            </P>

            <H2>4. Retention and deletion</H2>
            <P>
                Guest history remains in your browser until you delete it, clear browser data, or older sessions fall
                outside the 100-session limit. Cloud practice history keeps the most recent 100 sessions per account;
                older sessions are removed as new sessions are synced. The Account &amp; data page lets you export
                the history currently visible in your workspace and delete practice progress. Cloud deletion resets
                cached account history on other devices when they next sync. To request deletion of the sign-in
                account or other data associated with your email, contact <EmailLink /> from that email address.
            </P>
            <H2>5. Future changes</H2>
            <P>
                If we add analytics, advertising (such as Google AdSense), embedded videos, a newsletter or anything
                else that collects data or sets cookies, we will update this policy first, describe the third parties
                involved, and ask for your consent where the law requires it.
            </P>

            <H2>6. Your choices and rights</H2>
            <P>
                Depending on where you live, you may have the right to ask what personal data we hold about you, to
                have it corrected or deleted, and to object to its use. We handle personal data in line with
                applicable Indian law, including the Digital Personal Data Protection Act, 2023 as it comes into
                force. To make a request, email <EmailLink />. We will respond within a reasonable time.
            </P>

            <H2>7. Children</H2>
            <P>
                The site is meant for students. We do not knowingly collect personal data from children through the
                site. If you believe a child has sent us personal data, email us and we will delete it.
            </P>

            <H2>8. Changes to this policy</H2>
            <P>
                We may update this policy. The effective date at the top shows when the current version took effect.
            </P>

            <H2>9. Contact</H2>
            <P>
                Questions about this policy: <EmailLink />
                {LEGAL.postalAddress ? <> &middot; {LEGAL.postalAddress}</> : null}.
            </P>
        </LegalLayout>
    );
}
