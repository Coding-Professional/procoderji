"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Cloud,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { announceAccountChange } from "./client";
import { useProgress } from "@/features/progress/progress-provider";
import {
  primaryAction,
  secondaryAction,
} from "@/features/practice/client/styles";
import { CONTACT_EMAIL } from "@/lib/contact";

export function AccountPanel({ authFailed = false }: { authFailed?: boolean }) {
  const {
    user,
    ready,
    accountConfigured,
    csrfToken,
    refreshAccount,
    attempts,
    syncStatus,
    syncError,
    sync,
    clearProgress,
    importGuestProgress,
  } = useProgress();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    authFailed
      ? "Google sign-in could not be completed. Please try again."
      : "",
  );
  const runAction = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This action could not be completed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    const response = await fetch("/api/platform/auth/logout", {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken ?? "",
        "x-account-id": user?.id ?? "",
      },
    });
    if (!response.ok) throw new Error("Sign-out failed. Please try again.");
    await refreshAccount();
    announceAccountChange();
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, exportedAt: new Date().toISOString(), attempts },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "procoderji-practice-progress.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const confirmDelete = () => {
    const prompt = user
      ? "Delete all cloud practice history for this account and clear its progress on this device? This cannot be undone."
      : "Delete all guest practice history in this browser? This cannot be undone.";
    if (window.confirm(prompt))
      void runAction(
        clearProgress,
        "Practice history deleted for this workspace.",
      );
  };
  return (
    <>
      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
        You are in control
      </p>
      <h1 className="workspace-heading mt-2">Account & learning data</h1>
      <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
        Practise as a guest, or sign in with Google to keep your learning
        history across devices. No subscription is required.
      </p>
      {!ready ? (
        <p role="status" className="mt-7">
          Loading account…
        </p>
      ) : (
        <>
          <section className="mt-8 max-w-3xl rounded-lg border border-border bg-white p-6 sm:p-8">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <Cloud
                    aria-hidden="true"
                    className="h-6 w-6 text-emerald-700"
                  />
                  <h2 className="text-xl font-bold">Your learning account</h2>
                </div>
                <p className="mt-3 break-all text-sm text-muted-foreground">
                  Signed in as {user.email ?? user.name ?? "a Google learner"}
                </p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Completed sessions save on this device and sync to your
                  account. Guest history stays separate until you choose to
                  import it.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => void sync()}
                    disabled={busy || syncStatus === "syncing"}
                    className={secondaryAction}
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    {syncStatus === "syncing" ? "Syncing…" : "Sync progress"}
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Import this browser's guest practice history into your signed-in account?",
                        )
                      )
                        void runAction(
                          importGuestProgress,
                          "Guest progress imported on this device. Check sync status below for cloud availability.",
                        );
                    }}
                    disabled={busy}
                    className={secondaryAction}
                  >
                    Import guest progress
                  </button>
                  <button
                    onClick={() =>
                      void runAction(
                        signOut,
                        "Signed out. Guest progress is separate from your account history.",
                      )
                    }
                    disabled={busy}
                    className={secondaryAction}
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
                <p
                  role="status"
                  className={`mt-4 text-sm ${syncError ? "text-rose-700" : "text-muted-foreground"}`}
                >
                  {syncError ||
                    (syncStatus === "synced"
                      ? "Your progress is synced."
                      : syncStatus === "syncing"
                        ? "Syncing your learning history…"
                        : "Ready to sync.")}
                </p>
              </>
            ) : accountConfigured ? (
              <>
                <h2 className="text-xl font-bold">
                  Continue with your Google account
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Google confirms your identity. Your learning account uses your
                  basic profile and email; ProCoderJii does not receive your
                  Google password.
                </p>
                <form action="/api/platform/auth/google" method="get">
                  <input type="hidden" name="returnTo" value="/learn" />
                  <button type="submit" className={`${primaryAction} mt-6`}>
                    <LogIn aria-hidden="true" className="h-4 w-4" />
                    Continue with Google
                  </button>
                </form>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  By continuing, you agree to the{" "}
                  <Link href="/terms" className="underline">
                    Terms
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy" className="underline">
                    Privacy Policy
                  </Link>
                  . Guest history is imported only when you choose.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold">
                  Your browser is your workspace
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Google sign-in and account sync are unavailable right now.
                  Your completed sessions save in this browser, and all practice
                  remains available.
                </p>
                <Link href="/practice" className={`${primaryAction} mt-5`}>
                  Continue practising
                </Link>
              </>
            )}
          </section>
          <section className="mt-6 max-w-3xl rounded-lg border border-border bg-white p-6 sm:p-8">
            <h2 className="text-xl font-bold">Your progress data</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {attempts.length} saved sessions in this workspace. Export your
              visible history, or delete progress for{" "}
              {user
                ? "this account and its local workspace"
                : "this browser’s guest workspace"}
              .{" "}
              {user
                ? "Deleting practice progress does not delete your sign-in account."
                : "Clearing your browser’s storage also removes guest progress."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={download}
                disabled={busy || !attempts.length}
                className={secondaryAction}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Export progress
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy || (!user && !attempts.length)}
                className={`${secondaryAction} text-rose-700`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete progress
              </button>
            </div>
            {user && (
              <p className="mt-5 text-xs leading-6 text-muted-foreground">
                To request deletion of your sign-in account, email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                  {CONTACT_EMAIL}
                </a>{" "}
                from your account email.
              </p>
            )}
          </section>
        </>
      )}
      {message && (
        <p
          role="status"
          className="mt-5 max-w-3xl rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 max-w-3xl rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-800"
        >
          {error}
        </p>
      )}
    </>
  );
}
