"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { buildMailto, CONTACT_EMAIL } from "@/lib/contact";

const inputClass =
    "w-full min-w-0 min-h-12 bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors";
const labelClass = "text-sm font-semibold text-gray-900";

/**
 * There is no server-side mail service behind this site, so the form opens the
 * visitor's email app with a pre-filled message to the team address.
 */
export function ContactForm() {
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const get = (k: string) => String(data.get(k) ?? "");
        window.location.href = buildMailto({
            name: get("name"),
            email: get("email"),
            subject: get("subject"),
            message: get("message"),
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="contact-name" className={labelClass}>Name</label>
                    <input id="contact-name" name="name" type="text" required autoComplete="name" className={inputClass} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="contact-email" className={labelClass}>Email</label>
                    <input id="contact-email" name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@example.com" />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="contact-subject" className={labelClass}>Subject</label>
                <input id="contact-subject" name="subject" type="text" required className={inputClass} placeholder="Subject name / request" />
            </div>

            <div className="space-y-2">
                <label htmlFor="contact-message" className={labelClass}>Message</label>
                <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    className={`${inputClass} resize-y`}
                    placeholder="Tell us which notes or material you need."
                />
            </div>

            <button
                type="submit"
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all flex items-center justify-center gap-2 group"
            >
                <span>Open email to send</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
            <p className="text-sm text-gray-500">
                This opens your email app with the message filled in. If nothing opens, write to{" "}
                <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
        </form>
    );
}
