import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "./contact-form";
import { CONTACT_EMAIL } from "@/lib/contact";

export function Contact() {
  return (
    <section id="contact" className="section-block">
      <div className="page-container contact-layout">
        <div>
          <p className="eyebrow">There’s a person on the other end</p>
          <h2 className="section-title mt-4">
            Tell us what
            <br />
            would help.
          </h2>
          <p className="section-description">
            A missing topic, a confusing explanation or an idea for a student
            tool. We’d like to hear it.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-link mt-5 break-all"
          >
            {CONTACT_EMAIL}
            <ArrowUpRight aria-hidden="true" size={16} />
          </a>
          <p className="mt-4 max-w-sm text-xs leading-6 text-muted-foreground">
            The form prepares an email in your mail app. It doesn’t send or save
            your message on this website.
          </p>
        </div>
        <div className="contact-form">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
