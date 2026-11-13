import { Plus } from "lucide-react";
import Link from "next/link";

const faqs = [
  [
    "Are the notes and study files free?",
    "Yes. Published notes, placement practice and warm-up games are free to use. You can read and practise without an account.",
  ],
  [
    "Do I need to sign in?",
    "You can practise as a guest. Sign in with Google when you want to save progress across devices or save a private portfolio draft.",
  ],
  [
    "Can I publish my own portfolio?",
    "Yes, on a deployment with publishing enabled. Choose your address, review the public fields and confirm the publishing policy. You must be at least 18 to publish. Saving a draft does not publish it.",
  ],
  [
    "Can I download the notes as PDFs?",
    "Notes are currently available to read online. If a downloadable format would help, let us know which subject you need.",
  ],
  [
    "Are these official company placement tests?",
    "No. The questions and games are independent learning exercises. Use them to practise and understand concepts alongside your other preparation.",
  ],
  [
    "Can I help improve the project?",
    "Yes. Code, original practice questions, documentation and accessibility improvements are welcome on GitHub. If you spot an error in a note, you can also email the team.",
  ],
];

export function FAQ() {
  return (
    <section id="faq" className="section-block section-white">
      <div className="page-container faq-layout">
        <div>
          <p className="eyebrow">A few things you might be wondering</p>
          <h2 className="section-title mt-4">Good questions.</h2>
          <p className="section-description">Here’s how the platform works.</p>
          <Link href="/#contact" className="text-link mt-3">
            Ask us something else
          </Link>
        </div>
        <div>
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>
                {question}
                <Plus
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 transition-transform"
                />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
