"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function ContactCaptcha({ siteKey, onToken, onError }: {
  siteKey: string;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready || !container.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(container.current, {
      sitekey: siteKey, action: "contact", theme: "light", size: "flexible",
      callback: (token: string) => { onToken(token); onError(""); },
      "expired-callback": () => { onToken(""); onError("The security check expired. Please complete it again."); },
      "timeout-callback": () => { onToken(""); onError("The security check timed out. Please try it again."); },
      "error-callback": () => { onToken(""); onError("The security check could not load. Check your connection or reload this page."); },
    });
    return () => { api.remove(id); };
  }, [ready, siteKey, onToken, onError]);

  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      onReady={() => setReady(true)}
      onError={() => { onToken(""); onError("The security check could not load. Check your connection or reload this page."); }} />
    <div ref={container} className="min-h-[65px] w-full min-w-0" aria-label="Security check" />
  </>;
}
