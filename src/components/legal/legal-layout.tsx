import Link from "next/link";
import { Brand } from "@/components/brand";
import type { Metadata } from "next";
import {
  LEGAL,
  LEGAL_FIELD_LABELS,
  LEGAL_PAGES,
  isLegalComplete,
  missingLegalFields,
  type LegalDetails,
  type RequiredLegalField,
} from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";

/** Metadata for a legal page. Drafts are kept out of search results until the owner's details are complete. */
export function legalMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return pageMetadata({
    title,
    description,
    path,
    noindex: !isLegalComplete(),
  });
}

/** Shows the owner's value, or a clearly visible placeholder while it is still missing. */
export function Fill({ field }: { field: RequiredLegalField }) {
  const value = LEGAL[field as keyof LegalDetails] as string | null;
  if (value && value.trim()) return <>{value}</>;
  return (
    <mark className="rounded bg-yellow-200 px-1 font-semibold text-gray-900">
      [REQUIRED: {LEGAL_FIELD_LABELS[field]}]
    </mark>
  );
}

/** The operator's name plus, for an individual, a plain statement of that status. */
export function Operator() {
  return (
    <>
      <Fill field="operatorName" />
      {LEGAL.operatorType === "individual" ? ", an individual" : null}
    </>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 mb-3 text-xl font-bold text-gray-900">{children}</h2>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-7 text-gray-700">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mb-4 list-disc space-y-2 pl-6 leading-7 text-gray-700">
      {children}
    </ul>
  );
}

export function EmailLink() {
  return (
    <a
      className="font-semibold underline"
      href={`mailto:${LEGAL.contactEmail}`}
    >
      {LEGAL.contactEmail}
    </a>
  );
}

export function LegalLayout({
  title,
  children,
  effectiveDate,
}: {
  title: string;
  children: React.ReactNode;
  /** A trusted publication date supplied by the policy page, never visitor input. */
  effectiveDate?: string;
}) {
  const missing = missingLegalFields();
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between">
          <Brand />
          <Link
            href="/practice"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gray-700 underline"
          >
            Start practice
          </Link>
        </header>

        <main
          id="main-content"
          className="rounded-lg border border-border bg-white p-6 sm:p-10"
        >
          {missing.length > 0 && (
            <div
              role="note"
              className="mb-8 rounded-xl border border-yellow-400 bg-yellow-50 p-4 text-sm text-gray-900"
            >
              <p className="font-bold">
                Draft - not yet reviewed or published by the site owner.
              </p>
              <p className="mt-1">
                This text is a starting point and must be completed and checked
                with a qualified legal adviser before it is relied on. Still
                required:
              </p>
              <ul className="mt-2 list-disc pl-5">
                {missing.map((f) => (
                  <li key={f}>{LEGAL_FIELD_LABELS[f]}</li>
                ))}
              </ul>
            </div>
          )}

          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            Effective date:{" "}
            {effectiveDate ??
              (LEGAL.effectiveDate ? (
                LEGAL.effectiveDate
              ) : (
                <Fill field="effectiveDate" />
              ))}
          </p>
          {children}
        </main>

        <nav
          aria-label="Legal pages"
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600"
        >
          {LEGAL_PAGES.map((p) => (
            <Link
              key={p.path}
              href={p.path}
              className="underline hover:text-gray-900"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
