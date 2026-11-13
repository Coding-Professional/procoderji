import Link from "next/link";
import {
  EmailLink,
  H2,
  LegalLayout,
  Operator,
  P,
  UL,
  legalMetadata,
} from "@/components/legal/legal-layout";

export const metadata = legalMetadata(
  "About",
  "Learn about ProCoderJii, an open-source student platform for placement practice, explanations, free games and saved progress, and how to contribute.",
  "/about",
);

export default function AboutPage() {
  return (
    <LegalLayout title="About ProCoderJii">
      <P>
        ProCoderJii is a student learning brand built around concept videos,
        course resources, placement practice and a community of people learning
        together. Our YouTube channel, Telegram and WhatsApp communities connect
        students beyond this website. The open-source platform is operated by{" "}
        <Operator /> and grows through reviewed community contributions.
      </P>

      <H2>Practise and understand your answers</H2>
      <UL>
        <li>
          <Link className="font-semibold underline" href="/practice">
            Placement practice
          </Link>{" "}
          covers quantitative aptitude, logical reasoning, verbal ability and
          programming foundations. Each session includes correct answers and
          explanations.
        </li>
        <li>
          <Link className="font-semibold underline" href="/games">
            Free practice games
          </Link>{" "}
          include Pattern Sprint for number patterns and Digit Recall for
          short-term memory.
        </li>
        <li>
          The{" "}
          <Link className="font-semibold underline" href="/learn">
            learner workspace
          </Link>{" "}
          shows question-practice history, topic progress and a suggested next
          step.
        </li>
      </UL>

      <H2>Free practice and your progress</H2>
      <P>
        Practice is free and works without an account. Question-practice history
        is saved in this browser; clearing site data removes it. Optional Google
        sign-in can synchronize that history when account services are
        available. Game scores are shown at the end of a round and are not yet
        saved.
      </P>

      <H2>Learning content in development</H2>
      <P>
        Course, branch and semester navigation is in place. Reviewed course
        notes, guides and job listings are awaiting publication. The current
        learning exercises are independent practice for building skills; they do
        not predict or guarantee a placement result.
      </P>

      <H2>How to contribute</H2>
      <P>
        Students and developers can help with original questions, explanations,
        accessibility, documentation and code. Visit the{" "}
        <a
          className="font-semibold underline"
          href="https://github.com/procoderji-com/procoderji"
        >
          GitHub repository and contribution guide
        </a>{" "}
        to find a focused task and the checks it needs.
      </P>
      <UL>
        <li>
          Learning material is reviewed for correctness and clarity before
          publication.
        </li>
        <li>
          Where an official syllabus or question paper exists, we link to the
          university&apos;s own page instead of copying it.
        </li>
        <li>
          We do not republish other people&apos;s notes, papers or PDFs without
          permission.
        </li>
      </UL>

      <H2>Corrections and requests</H2>
      <P>
        Found a mistake, or want a subject covered? Email <EmailLink /> or open
        a reproducible issue in the repository. See the{" "}
        <Link className="font-semibold underline" href="/disclaimer">
          Disclaimer
        </Link>{" "}
        for the limits of the learning material.
      </P>
    </LegalLayout>
  );
}
