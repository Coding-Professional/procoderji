"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div role="alert" className="max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Something went wrong
        </p>
        <h1 className="workspace-heading mt-2">
          This page could not be loaded
        </h1>
        <p className="mt-3 text-gray-600">
          Please try again. If it keeps happening, email us and we will look
          into it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="pcj-button pcj-button-primary"
          >
            Try again
          </button>
          <Link href="/" className="pcj-button pcj-button-secondary">
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
