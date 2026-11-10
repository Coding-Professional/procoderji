"use client";

export interface LearnerUser {
  id: string;
  email: string | null;
  name: string | null;
}
export interface AccountSession {
  configured: boolean;
  user: LearnerUser | null;
  csrfToken: string | null;
}

export async function readAccountSession(): Promise<AccountSession> {
  const response = await fetch("/api/platform/auth/session", {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Account service is unavailable.");
  const body = await response.json();
  if (
    typeof body.configured !== "boolean" ||
    (body.user !== null && (!body.user || typeof body.user.id !== "string"))
  )
    throw new Error("Invalid account response.");
  return {
    configured: body.configured,
    user: body.user
      ? {
          id: body.user.id,
          email: typeof body.user.email === "string" ? body.user.email : null,
          name: typeof body.user.name === "string" ? body.user.name : null,
        }
      : null,
    csrfToken: typeof body.csrfToken === "string" ? body.csrfToken : null,
  };
}

export function announceAccountChange() {
  try {
    window.localStorage.setItem("procoderji:auth-change", String(Date.now()));
  } catch {
    /* Storage is optional. */
  }
  window.dispatchEvent(new Event("procoderji-auth-change"));
}
