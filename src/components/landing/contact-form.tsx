"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ContactCaptcha } from "./contact-captcha";

const inputClass =
    "w-full min-w-0 min-h-12 bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-colors";
const labelClass = "text-sm font-semibold text-gray-900";

export function ContactForm() {
    const [siteKey, setSiteKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState("");
    const [captchaVersion, setCaptchaVersion] = useState(0);
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);
    const [error, setError] = useState("");
    const [captchaError, setCaptchaError] = useState("");
    const [success, setSuccess] = useState("");
    const onToken = useCallback((value: string) => setToken(value), []);
    const onCaptchaError = useCallback((value: string) => setCaptchaError(value), []);

    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/platform/contact/config", { cache: "no-store", signal: controller.signal })
            .then(async response => {
                if (!response.ok) throw new Error();
                const config = await response.json();
                if (!config.configured || typeof config.siteKey !== "string" || !config.siteKey) throw new Error();
                setSiteKey(config.siteKey);
            })
            .catch(() => { if (!controller.signal.aborted) setError("Message submission is temporarily unavailable. Please try again later."); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting.current) return;
        if (!token) { setError("Please complete the security check before sending."); return; }
        const form = e.currentTarget;
        const data = new FormData(form);
        const get = (k: string) => String(data.get(k) ?? "");
        submitting.current = true;
        setBusy(true); setError(""); setSuccess("");
        try {
            const response = await fetch("/api/platform/contact", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: get("name"), email: get("email"), subject: get("subject"),
                    message: get("message"), website: get("website"), captchaToken: token }),
                signal: AbortSignal.timeout(25_000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Your message could not be saved. Please try again.");
            form.reset();
            setSuccess("Your message has been received. Our team will review it.");
        } catch (failure) {
            setError(failure instanceof Error && failure.name === "Error" ? failure.message :
                "We could not confirm your submission. Your message is still here; please try again.");
        } finally {
            submitting.current = false;
            setBusy(false); setToken(""); setCaptchaError(""); setCaptchaVersion(value => value + 1);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6" aria-busy={busy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="contact-name" className={labelClass}>Name</label>
                    <input id="contact-name" name="name" type="text" required disabled={busy} maxLength={100} autoComplete="name" className={inputClass} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="contact-email" className={labelClass}>Email</label>
                    <input id="contact-email" name="email" type="email" required disabled={busy} maxLength={254} autoComplete="email" className={inputClass} placeholder="you@example.com" />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="contact-subject" className={labelClass}>Subject</label>
                <input id="contact-subject" name="subject" type="text" required disabled={busy} maxLength={160} className={inputClass} placeholder="Subject name / request" />
            </div>

            <div className="space-y-2">
                <label htmlFor="contact-message" className={labelClass}>Message</label>
                <textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    maxLength={4000}
                    disabled={busy}
                    className={`${inputClass} resize-y`}
                    placeholder="Tell us which notes or material you need."
                />
            </div>

            <div className="absolute -left-[10000px]" aria-hidden="true">
                <label htmlFor="contact-website">Leave this field empty</label>
                <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {siteKey && <ContactCaptcha key={captchaVersion} siteKey={siteKey} onToken={onToken} onError={onCaptchaError} />}
            {loading && <p role="status" className="text-sm text-gray-600">Loading security check…</p>}
            {(error || captchaError) && <p role="alert" className="text-sm text-red-700">{error || captchaError}</p>}
            {success && <p role="status" className="text-sm font-medium text-gray-900">{success}</p>}

            <button
                type="submit"
                disabled={busy || !siteKey || !token}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 group"
            >
                <span>{busy ? "Sending…" : "Send message"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
            <p className="text-sm text-gray-500">
                Your message is sent directly to our team. Please don&apos;t include passwords or sensitive documents.{" "}
                <Link className="underline" href="/privacy">Privacy policy</Link>. Security check by Cloudflare Turnstile.
            </p>
        </form>
    );
}
