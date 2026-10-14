import { EmailLink, Fill, H2, LegalLayout, P, UL, legalMetadata } from "@/components/legal/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata = legalMetadata(
    "Copyright & Takedown",
    "How to report content on ProCoderJii Notes that you believe infringes your copyright.",
    "/copyright"
);

export default function CopyrightPage() {
    return (
        <LegalLayout title="Copyright & Takedown">
            <H2>Our content</H2>
            <P>
                Unless a page says otherwise, the original notes and other content on this site are the copyright of{" "}
                <Fill field="operatorName" />, all rights reserved. See the Terms of Use for what you may do with it.
            </P>

            <H2>Respecting other people&apos;s work</H2>
            <P>
                We aim to publish only original material or material we have permission to use, and to link to
                official sources instead of copying them. If you believe something on this site infringes your
                copyright, please tell us.
            </P>

            <H2>How to send a notice</H2>
            <P>
                Email <EmailLink />
                {LEGAL.grievanceContact ? <> (or {LEGAL.grievanceContact})</> : null} with:
            </P>
            <UL>
                <li>A description of the work you believe has been infringed, and proof that you own or represent the owner of it.</li>
                <li>The exact web address (URL) of the page on this site where the material appears.</li>
                <li>Your name, email address and a way to contact you.</li>
                <li>A statement that you believe in good faith that the use is not authorised by the owner, the law or a licence.</li>
                <li>A statement that the information in your notice is accurate, and your signature (typing your full name is fine).</li>
            </UL>

            <H2>What happens next</H2>
            <P>
                Indian copyright law (the Copyright Act, 1957) applies to notices sent to this site. We will review
                the notice promptly. If the complaint appears valid we may remove or restrict the material while we
                look into it, and we may contact the person who supplied it. If you believe material
                was removed by mistake, you can reply to us explaining why and we will review again.
            </P>

            <H2>Misleading notices</H2>
            <P>
                Please send notices in good faith. Knowingly false claims may carry legal consequences.
            </P>
        </LegalLayout>
    );
}
