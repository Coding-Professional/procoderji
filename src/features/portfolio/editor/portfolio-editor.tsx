"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Eye, Plus, Save, Trash2 } from "lucide-react";
import { useProgress } from "@/features/progress/progress-provider";
import { primaryAction, secondaryAction } from "@/features/practice/client/styles";
import { CONTACT_EMAIL } from "@/lib/contact";
import { createPortfolioClient, PortfolioApiError, readOwnPortfolio, type OwnedPortfolio, type PortfolioWorkspace } from "../client";
import { parsePortfolioMarkdown, PORTFOLIO_MARKDOWN_AI_PROMPT, PORTFOLIO_MARKDOWN_MAX_BYTES } from "../markdown";
import { PORTFOLIO_RULES as RULES } from "../rules";
import type { PortfolioData, PortfolioProblem } from "../types";
import { validatePortfolio, validateUsername } from "../validation";
import { PortfolioPreview } from "../themes/portfolio-preview";

const card = "workspace-card";
const input = "mt-2 block min-h-11 w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-base text-foreground outline-offset-4 placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-slate-900 disabled:bg-background disabled:text-muted-foreground";
const smallAction = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-40";
const initialData: PortfolioData = {};
const fieldId = (path: string) => `portfolio-${path.replace(/[^a-zA-Z0-9-]/g, "-")}`;
const fingerprint = (data: PortfolioData, searchVisible: boolean) => JSON.stringify({ data, searchVisible });

function problemMessage(problem: PortfolioProblem) {
  const messages: Record<string, string> = {
    required: "Complete this field.", "invalid-type": "Enter a value in the expected format.",
    "unknown-field": "This field is not supported.", "too-short": "Enter at least 3 characters.",
    "too-long": "Shorten this value to the stated limit.", "too-many": "Remove entries above the stated limit.",
    "invalid-characters": "Remove hidden characters or unsupported line breaks.",
    "html-like": "Use plain text without HTML or JSX.", "invalid-format": "Use lowercase letters, digits and single hyphens.",
    "invalid-link": "Enter a complete https:// address without spaces or credentials.",
    "invalid-host": "Use the matching GitHub or LinkedIn website.", "invalid-email": "Enter an email address, without mailto:.",
    reserved: "This username is reserved.", "blocked-word": "Choose another username.",
  };
  return messages[problem.code] ?? "Check this value before continuing.";
}

interface FieldProps {
  path: string; label: string; value: string; onChange: (value: string) => void;
  problems: PortfolioProblem[]; maxLength?: number; hint?: string; multiline?: boolean;
  type?: "text" | "url" | "email"; disabled?: boolean;
}

function Field({ path, label, value, onChange, problems, maxLength, hint, multiline, type = "text", disabled }: FieldProps) {
  const error = problems.find(problem => problem.path === path);
  const id = fieldId(path);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  const attributes = {
    id, value, maxLength, disabled, "aria-invalid": error ? true as const : undefined, "aria-describedby": describedBy,
    className: `${input} ${error ? "border-rose-600" : ""}`,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
  };
  return <div>
    <label htmlFor={id} className="block text-sm font-semibold text-foreground">{label}</label>
    {hint && <p id={`${id}-hint`} className="mt-1 text-sm leading-6 text-muted-foreground">{hint}</p>}
    {multiline ? <textarea {...attributes} rows={4} /> : <input {...attributes} type={type} />}
    {error && <p id={`${id}-error`} className="mt-2 text-sm font-medium text-rose-700">{problemMessage(error)}</p>}
  </div>;
}

function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return <details className={card}>
    <summary className="min-h-11 cursor-pointer text-lg font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900">
      {title}{count !== undefined && <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>}
    </summary>
    <div className="mt-5 space-y-5">{children}</div>
  </details>;
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return [...items];
  const result = [...items];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function EntryControls({ label, index, length, onMove, onRemove }: { label: string; index: number; length: number; onMove: (to: number) => void; onRemove: () => void }) {
  return <div className="flex shrink-0 gap-2">
    <button type="button" className={smallAction} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} ${index + 1} up`} title="Move up"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
    <button type="button" className={smallAction} disabled={index === length - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${label} ${index + 1} down`} title="Move down"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
    <button type="button" className={smallAction} onClick={onRemove} aria-label={`Remove ${label} ${index + 1}`} title="Remove"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
  </div>;
}

function StringList({ path, label, items, limit, maxLength, problems, onChange }: {
  path: string; label: string; items: string[]; limit: number; maxLength: number;
  problems: PortfolioProblem[]; onChange: (items: string[]) => void;
}) {
  return <div className="space-y-3" id={fieldId(path)} tabIndex={-1}>
    <p className="text-sm text-muted-foreground">Up to {limit} entries, {maxLength} characters each.</p>
    {items.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <Field path={`${path}[${index}]`} label={`${label} ${index + 1}`} value={item} maxLength={maxLength} problems={problems} onChange={value => onChange(items.map((old, position) => position === index ? value : old))} />
      <EntryControls label={label.toLowerCase()} index={index} length={items.length} onMove={next => { onChange(move(items, index, next)); requestAnimationFrame(() => document.getElementById(fieldId(`${path}[${next}]`))?.focus()); }} onRemove={() => onChange(items.filter((_, position) => position !== index))} />
    </div>)}
    {problems.some(problem => problem.path === path) && <p className="text-sm text-rose-700">{problemMessage(problems.find(problem => problem.path === path)!)}</p>}
    <button type="button" className={secondaryAction} disabled={items.length >= limit} onClick={() => onChange([...items, ""])}><Plus className="h-4 w-4" aria-hidden="true" />Add {label.toLowerCase()}</button>
  </div>;
}

type EntryKind = "projects" | "education" | "experience";
type ObjectEntry = NonNullable<PortfolioData[EntryKind]>[number];
const ENTRY_FIELDS: Record<EntryKind, { key: string; label: string; max: string; multiline?: boolean; type?: "url" }[]> = {
  projects: [{ key: "title", label: "Project title", max: "projects.title" }, { key: "link", label: "Project link", max: "link", type: "url" }, { key: "description", label: "Project description", max: "projects.description", multiline: true }],
  education: [{ key: "institution", label: "Institution", max: "education.institution" }, { key: "degree", label: "Degree or qualification", max: "education.degree" }, { key: "period", label: "Education period", max: "education.period" }, { key: "details", label: "Education details", max: "education.details", multiline: true }],
  experience: [{ key: "organization", label: "Organization", max: "experience.organization" }, { key: "role", label: "Role", max: "experience.role" }, { key: "period", label: "Experience period", max: "experience.period" }, { key: "description", label: "Experience description", max: "experience.description", multiline: true }],
};

export function PortfolioEditor() {
  const { user, ready, accountConfigured, csrfToken, refreshAccount } = useProgress();
  if (!ready) return <p role="status">Loading your portfolio workspace…</p>;
  return <EditorWorkspace key={user?.id ?? "guest"} userId={user?.id ?? null} csrfToken={csrfToken} accountConfigured={accountConfigured} refreshAccount={refreshAccount} />;
}

function EditorWorkspace({ userId, csrfToken, accountConfigured, refreshAccount }: { userId: string | null; csrfToken: string | null; accountConfigured: boolean; refreshAccount: () => Promise<void> }) {
  const [data, setData] = useState<PortfolioData>(initialData);
  const [record, setRecord] = useState<OwnedPortfolio | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState(fingerprint(initialData, false));
  const [workspace, setWorkspace] = useState<PortfolioWorkspace | null>(null);
  const [loading, setLoading] = useState(userId !== null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [problems, setProblems] = useState<PortfolioProblem[]>([]);
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState("");
  const [conflict, setConflict] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [dialogKind, setDialogKind] = useState<"delete" | "reload">("delete");
  const dialog = useRef<HTMLDialogElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const dirtyRef = useRef(false);
  const fileReadGeneration = useRef(0);
  const dirty = savedFingerprint !== fingerprint(data, searchVisible);
  const accountActionsDisabled = !userId || !csrfToken || loading || busy || loadFailed;
  const suspended = record?.status === "suspended";

  useEffect(() => {
    const pendingReads = fileReadGeneration;
    mounted.current = true;
    return () => { mounted.current = false; pendingReads.current++; };
  }, []);
  useEffect(() => { dirtyRef.current = dirty; });
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void readOwnPortfolio(userId, controller.signal).then(value => {
      if (controller.signal.aborted) return;
      setWorkspace(value);
      setRecord(value.portfolio);
      setData(value.portfolio?.data ?? {});
      setSearchVisible(value.portfolio?.searchVisible ?? false);
      setUsername(value.portfolio?.username ?? "");
      setSavedFingerprint(fingerprint(value.portfolio?.data ?? {}, value.portfolio?.searchVisible ?? false));
      setLoading(false);
    }).catch(cause => {
      if (controller.signal.aborted) return;
      setLoadFailed(true);
      setLoading(false);
      setError(cause instanceof Error ? cause.message : "Your saved draft could not be loaded.");
    });
    return () => controller.abort();
  }, [userId]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const confirmNavigation = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || !["http:", "https:"].includes(destination.protocol) ||
          (destination.pathname === window.location.pathname && destination.search === window.location.search)) return;
      if (!window.confirm("Leave the portfolio editor? Your unsaved changes will be lost.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", confirmNavigation, true);
    return () => document.removeEventListener("click", confirmNavigation, true);
  }, []);

  const update = (patch: Partial<PortfolioData>) => {
    dirtyRef.current = true;
    setData(current => ({ ...current, ...patch }));
    setProblems([]);
    setError("");
    setMessage("");
  };
  const showProblems = (next: PortfolioProblem[]) => {
    setProblems(next);
    requestAnimationFrame(() => errorSummary.current?.focus());
    return next.length === 0;
  };
  const applyRecord = (next: OwnedPortfolio, replaceDraft = false) => {
    if (!mounted.current) return;
    setRecord(next);
    setUsername(next.username ?? "");
    setConflict(false);
    if (replaceDraft) {
      dirtyRef.current = false;
      setData(next.data);
      setSearchVisible(next.searchVisible);
      setSavedFingerprint(fingerprint(next.data, next.searchVisible));
    }
  };
  const run = async (action: () => Promise<void>, success?: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    fileReadGeneration.current++;
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      if (mounted.current && success) setMessage(success);
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof PortfolioApiError) {
        setProblems(cause.problems);
        setConflict(cause.code === "stale-revision" || (cause.status === 409 && cause.code === "unavailable"));
        setError(`${cause.message}${cause.retryAfterSeconds ? ` Try again in ${cause.retryAfterSeconds} seconds.` : ""}`);
        if (cause.status === 401 || cause.status === 409) void refreshAccount();
      } else setError(cause instanceof Error ? cause.message : "This action could not be completed.");
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const api = () => createPortfolioClient({ userId: userId ?? "", csrfToken });
  const saveCurrent = async () => {
    const next = await api().saveDraft(data, searchVisible, record?.revision ?? null);
    applyRecord(next, true);
    return next;
  };
  const save = () => {
    if (accountActionsDisabled) return;
    if (!showProblems(validatePortfolio(data, "draft"))) return;
    void run(async () => { await saveCurrent(); }, "Private draft saved. Your public page changes only when you publish.");
  };
  const publish = () => {
    if (!eligible || !workspace?.policyVersion || !record?.username || !workspace.publishingEnabled || suspended) return;
    if (!showProblems(validatePortfolio(data, "publish"))) return;
    void run(async () => {
      const current = dirty ? await saveCurrent() : record;
      const next = await api().publish(current.revision, workspace.policyVersion!);
      applyRecord(next);
      if (mounted.current) setEligible(false);
    }, "Your portfolio is published. Open your public page to review it.");
  };
  const loadLatest = () => void run(async () => {
    if (!userId) return;
    const next = await readOwnPortfolio(userId);
    if (!mounted.current) return;
    setWorkspace(next); setLoadFailed(false); setConflict(false);
    if (next.portfolio) applyRecord(next.portfolio, true);
    else { dirtyRef.current = false; setRecord(null); setData({}); setSearchVisible(false); setUsername(""); setSavedFingerprint(fingerprint({}, false)); }
  }, "Latest saved draft loaded.");
  const requestReload = () => {
    if (dirty) { setDialogKind("reload"); dialog.current?.showModal(); }
    else loadLatest();
  };
  const focusProblem = (path: string) => {
    const target = document.getElementById(fieldId(path));
    let ancestor = target?.parentElement;
    while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
    target?.focus();
  };

  function objects(kind: EntryKind, label: string) {
    const entries = data[kind] ?? [];
    const limit = RULES.maxItems[kind];
    return <Section title={label} count={entries.length}>
      <p className="text-sm text-muted-foreground">Up to {limit} entries. Add the required title or institution before saving.</p>
      <div id={fieldId(kind)} tabIndex={-1} className="space-y-5">
        {entries.map((entry, index) => {
          const values = entry as unknown as Record<string, string | string[] | undefined>;
          const replace = (patch: Record<string, string | string[]>) => update({ [kind]: entries.map((old, position) => position === index ? { ...old, ...patch } : old) });
          return <fieldset key={index} id={fieldId(`${kind}[${index}]`)} tabIndex={-1} className="min-w-0 space-y-4 rounded-xl border border-border bg-background p-4">
            <legend className="px-2 text-sm font-bold text-foreground">{label.replace(/s$/, "")} {index + 1}</legend>
            <EntryControls label={kind === "projects" ? "project" : kind === "education" ? "education entry" : "experience"} index={index} length={entries.length} onMove={next => { update({ [kind]: move<ObjectEntry>(entries, index, next) }); requestAnimationFrame(() => document.getElementById(fieldId(`${kind}[${next}].${ENTRY_FIELDS[kind][0].key}`))?.focus()); }} onRemove={() => update({ [kind]: entries.filter((_, position) => position !== index) })} />
            {ENTRY_FIELDS[kind].map(field => <Field key={field.key} path={`${kind}[${index}].${field.key}`} label={field.label} value={typeof values[field.key] === "string" ? values[field.key] as string : ""} maxLength={RULES.maxLength[field.max]} multiline={field.multiline} type={field.type} problems={problems} onChange={value => replace({ [field.key]: value })} hint={field.type === "url" ? "Optional https:// project address." : undefined} />)}
            {kind === "projects" && <div>
              <h3 className="mb-3 text-sm font-bold text-foreground">Technologies</h3>
              <StringList path={`projects[${index}].technologies`} label="Technology" items={Array.isArray(values.technologies) ? values.technologies : []} limit={RULES.maxItems["projects.technologies"]} maxLength={RULES.maxLength["projects.technologies.item"]} problems={problems} onChange={technologies => replace({ technologies })} />
            </div>}
          </fieldset>;
        })}
      </div>
      <button type="button" className={secondaryAction} disabled={entries.length >= limit} onClick={() => update({ [kind]: [...entries, kind === "projects" ? { title: "" } : kind === "education" ? { institution: "" } : { organization: "", role: "" }] })}><Plus className="h-4 w-4" aria-hidden="true" />Add {kind === "projects" ? "project" : kind === "education" ? "education" : "experience"}</button>
    </Section>;
  }

  const importMarkdown = (source: string) => {
    const result = parsePortfolioMarkdown(source);
    if (!result.ok) { setImportErrors(result.problems.map(problem => `${problem.line ? `Line ${problem.line}: ` : ""}${problem.message}`)); return; }
    if (dirtyRef.current && !window.confirm("Replace the current form with these imported details? Your saved portfolio stays unchanged until you save.")) return;
    dirtyRef.current = true;
    setData(result.data); setProblems([]); setError(""); setImportErrors([]);
    setMessage("Markdown imported into the form. Review every section and the preview before saving.");
  };

  return <>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Your work, in one place</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Portfolio builder</h1>
        <p className="mt-3 leading-7 text-muted-foreground">Introduce yourself, show your projects and choose a simple public page. Keep changes private until you are ready to publish.</p>
      </div>
      <a href="#portfolio-preview" className={secondaryAction}><Eye className="h-4 w-4" aria-hidden="true" />Jump to live preview</a>
    </div>

    {!userId && <section className={`${card} mt-6 border-amber-200 bg-amber-50`}>
      <h2 className="font-bold text-foreground">Try the editor, then sign in to save</h2>
      <p className="mt-2 text-sm leading-6 text-foreground">Your guest draft stays only in this open page. It is cleared when you leave or change accounts. A Google account is needed to save a private draft, claim an address or publish.</p>
      {accountConfigured ? <form action="/api/platform/auth/google" method="get" className="mt-4"><input type="hidden" name="returnTo" value="/learn/portfolio" /><button type="submit" className={primaryAction}>Continue with Google</button></form> : <p className="mt-3 text-sm text-muted-foreground">Account services are not available on this deployment. You can still try the preview. <Link className="font-semibold underline" href="/account">View account options</Link>.</p>}
    </section>}

    {loading && <p role="status" className="mt-6 text-sm text-muted-foreground">Loading your private draft…</p>}
    <div ref={errorSummary} tabIndex={-1} role={error || problems.length ? "alert" : undefined} className={error || problems.length ? "mt-6 rounded-xl border border-rose-300 bg-rose-50 p-5 text-rose-900 outline-offset-4" : "hidden"}>
      <h2 className="font-bold">Check your portfolio before continuing</h2>
      {error && <p className="mt-2 text-sm leading-6">{error}</p>}
      {problems.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{problems.map((problem, index) => <li key={`${problem.path}:${problem.code}:${index}`}><a href={`#${fieldId(problem.path)}`} onClick={() => focusProblem(problem.path)} className="underline">{problem.path}: {problemMessage(problem)}</a></li>)}</ul>}
    </div>
    {message && <p role="status" className="mt-5 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />{message}</p>}
    {(conflict || loadFailed) && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-foreground"><p>{conflict ? "Another update was saved. Your unsaved edits are still here. Load the latest draft before trying to save again." : "Your saved draft could not be loaded. Retry before saving to your account."}</p><button type="button" className={`${secondaryAction} mt-3`} disabled={busy} onClick={requestReload}>Load latest draft</button></div>}
    {suspended && <div role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-foreground">Your public portfolio is suspended. You can edit your private draft or unpublish it. Contact <a className="font-semibold underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to request a review.</div>}

    <div className="mt-7 grid items-start gap-7 xl:grid-cols-2">
      <form noValidate onSubmit={event => { event.preventDefault(); save(); }}>
        <fieldset disabled={busy || loading} className="min-w-0 space-y-5">
          <legend className="sr-only">Portfolio details</legend>
          <section className={`${card} space-y-5`}>
            <h2 className="text-xl font-bold text-foreground">Introduction</h2>
            <Field path="name" label="Name" value={data.name ?? ""} maxLength={RULES.maxLength.name} problems={problems} onChange={name => update({ name })} hint="Required to publish. Use the name you want to show publicly." />
            <Field path="headline" label="Headline" value={data.headline ?? ""} maxLength={RULES.maxLength.headline} problems={problems} onChange={headline => update({ headline })} hint="Required to publish. A short introduction, such as your course and interests." />
            <Field path="about" label="About you" value={data.about ?? ""} maxLength={RULES.maxLength.about} problems={problems} multiline onChange={about => update({ about })} hint="Share your interests and goals. Do not add a phone number or home address." />
          </section>
          <Section title="Skills" count={data.skills?.length ?? 0}><StringList path="skills" label="Skill" items={data.skills ?? []} limit={RULES.maxItems.skills} maxLength={RULES.maxLength["skills.item"]} problems={problems} onChange={skills => update({ skills })} /></Section>
          {objects("projects", "Projects")}
          {objects("education", "Education")}
          {objects("experience", "Experience")}
          <Section title="Achievements" count={data.achievements?.length ?? 0}><StringList path="achievements" label="Achievement" items={data.achievements ?? []} limit={RULES.maxItems.achievements} maxLength={RULES.maxLength["achievements.item"]} problems={problems} onChange={achievements => update({ achievements })} /></Section>
          <Section title="Links and optional public email">
            {([['github','GitHub profile'],['linkedin','LinkedIn profile'],['website','Personal website'],['email','Public email']] as const).map(([key,label]) => <Field key={key} path={`links.${key}`} label={label} value={data.links?.[key] ?? ""} maxLength={key === "email" ? RULES.maxLength.email : RULES.maxLength.link} type={key === "email" ? "email" : "url"} problems={problems} onChange={value => update({ links: { ...data.links, [key]: value } })} hint={key === "email" ? "Optional. This address becomes visible to everyone when published." : "Optional complete https:// address."} />)}
          </Section>
          <section className={`${card} space-y-4`}>
            <h2 className="text-xl font-bold text-foreground">Appearance and search visibility</h2>
            <label className="block text-sm font-semibold text-foreground" htmlFor="portfolio-theme">Theme</label>
            <select id="portfolio-theme" className={input} value={data.theme ?? "simple"} onChange={event => update({ theme: event.target.value as "simple" | "developer" })}><option value="simple">Simple</option><option value="developer">Developer</option></select>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-foreground"><input className="mt-1 h-5 w-5 shrink-0 accent-primary" type="checkbox" checked={searchVisible} onChange={event => { dirtyRef.current = true; setSearchVisible(event.target.checked); setMessage(""); }} />Allow search engines to discover my published portfolio</label>
            <p className="text-sm leading-6 text-muted-foreground">Off by default. A published page can still be opened by anyone with its address. This setting changes only after publishing; search engines may take time to update.</p>
          </section>
          <section className={`${card} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-foreground">Save and publish</h2><span className="text-sm font-medium text-muted-foreground">{busy ? "Working…" : dirty ? "Unsaved changes" : record ? "Draft saved" : "New draft"}</span></div>
            <button type="submit" className={primaryAction} disabled={accountActionsDisabled}><Save className="h-4 w-4" aria-hidden="true" />Save draft</button>
            <p className="text-sm leading-6 text-muted-foreground">Saving a draft keeps it private. Publishing makes a copy of your current details available at your chosen address.</p>
            <div className="border-t border-border pt-4">
              <Field path="username" label="Public username" value={username} maxLength={RULES.username.maxLength} problems={problems} disabled={!!record?.username} onChange={value => { setUsername(value); setAvailability(""); setProblems([]); }} hint={record?.username ? "This username is fixed for this portfolio. Deleting an ordinary portfolio releases the address." : "3–30 lowercase letters, digits and single hyphens. A claimed username cannot be changed."} />
              {record?.username ? <p className="mt-2 text-sm font-semibold text-foreground">Claimed address: /u/{record.username}</p> : <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className={secondaryAction} disabled={accountActionsDisabled} onClick={() => { if (!showProblems(validateUsername(username))) return; void run(async () => { const available = await api().checkUsername(username); if (mounted.current) setAvailability(available ? "This username is available. It is reserved only after you claim it." : "This username is already claimed."); }); }}>Check availability</button>
                <button type="button" className={secondaryAction} disabled={accountActionsDisabled} onClick={() => { if (!showProblems(validateUsername(username))) return; void run(async () => { applyRecord(await api().claimUsername(username, record?.revision ?? null)); }, "Username claimed. Review your details before publishing."); }}>Claim username</button>
              </div>}
              {availability && <p role="status" className="mt-2 text-sm text-foreground">{availability}</p>}
            </div>
            {userId && workspace && !workspace.publishingEnabled && <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-950">Public publishing is not available on this deployment. You can prepare and save a private draft.</p>}
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6 text-foreground"><input className="mt-1 h-5 w-5 shrink-0 accent-primary" type="checkbox" checked={eligible} onChange={event => setEligible(event.target.checked)} disabled={accountActionsDisabled || !workspace?.publishingEnabled || suspended} />I am 18 or older and have read the portfolio Terms and Privacy Policy</label>
            <p className="text-sm text-muted-foreground">Read the <Link className="font-semibold underline" href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and <Link className="font-semibold underline" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>. No date of birth is collected.</p>
            {!record?.username && <p className="text-sm text-muted-foreground">Claim a username before publishing.</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" className={primaryAction} disabled={accountActionsDisabled || !workspace?.publishingEnabled || !workspace.policyVersion || !eligible || !record?.username || suspended} onClick={publish}>Publish portfolio</button>
              {record && (record.status === "published" || record.status === "suspended") && <button type="button" className={secondaryAction} disabled={accountActionsDisabled} onClick={() => void run(async () => applyRecord(await api().unpublish(record.revision)), "Your portfolio is no longer public. Your draft is still saved.")}>Unpublish</button>}
              {record?.status === "published" && record.username && <Link className={secondaryAction} href={`/u/${record.username}`} target="_blank" rel="noopener noreferrer">View public portfolio</Link>}
            </div>
            {record && <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4"><button type="button" className={secondaryAction} disabled={accountActionsDisabled} onClick={requestReload}>Load latest draft</button><button type="button" className={`${secondaryAction} text-rose-700`} disabled={accountActionsDisabled || suspended} onClick={() => { setDialogKind("delete"); dialog.current?.showModal(); }}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete portfolio</button></div>}
          </section>
          <Section title="Import a Markdown draft">
            <p className="text-sm leading-6 text-muted-foreground">Fill the template yourself or with your own AI tool, then import it for review. Only share details you want in your portfolio. Importing does not save or publish.</p>
            <a href="/templates/portfolio.md" download className={secondaryAction}>Download Markdown template</a>
            <label htmlFor="portfolio-markdown-file" className="block text-sm font-semibold text-foreground">Choose a Markdown text file (up to 50 KiB)</label>
            <input id="portfolio-markdown-file" className="block max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:font-semibold" type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={event => {
              const generation = ++fileReadGeneration.current;
              const file = event.target.files?.[0]; event.target.value = "";
              if (!file) return;
              if (file.size > PORTFOLIO_MARKDOWN_MAX_BYTES || !/\.(md|markdown|txt)$/i.test(file.name)) { setImportErrors(["Choose a Markdown text file no larger than 50 KiB."]); return; }
              void file.arrayBuffer().then(buffer => {
                if (!mounted.current || generation !== fileReadGeneration.current) return;
                const source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
                setMarkdown(source); importMarkdown(source);
              }).catch(() => { if (mounted.current && generation === fileReadGeneration.current) setImportErrors(["The file could not be read. Save it as UTF-8 Markdown and try again."]); });
            }} />
            <label htmlFor="portfolio-markdown" className="block text-sm font-semibold text-foreground">Or paste Markdown</label>
            <textarea id="portfolio-markdown" className={input} rows={7} value={markdown} onChange={event => { fileReadGeneration.current++; setMarkdown(event.target.value); setImportErrors([]); }} />
            <button type="button" className={secondaryAction} onClick={() => { fileReadGeneration.current++; importMarkdown(markdown); }}>Import into form</button>
            {importErrors.length > 0 && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"><p className="font-bold">The Markdown needs a correction</p><ul className="mt-2 list-disc space-y-1 pl-5">{importErrors.map((problem,index) => <li key={index}>{problem}</li>)}</ul></div>}
            <label htmlFor="portfolio-ai-prompt" className="block text-sm font-semibold text-foreground">Optional AI prompt</label>
            <textarea id="portfolio-ai-prompt" className={input} rows={5} value={PORTFOLIO_MARKDOWN_AI_PROMPT} readOnly />
            <button type="button" className={secondaryAction} onClick={() => {
              if (!navigator.clipboard?.writeText) { setImportErrors(["Copy is unavailable here. Select and copy the prompt text above."]); return; }
              void navigator.clipboard.writeText(PORTFOLIO_MARKDOWN_AI_PROMPT).then(() => { if (mounted.current) setMessage("AI prompt copied. Add your details and review the result before importing."); }).catch(() => { if (mounted.current) setImportErrors(["Copy is unavailable here. Select and copy the prompt text above."]); });
            }}><Copy className="h-4 w-4" aria-hidden="true" />Copy AI prompt</button>
          </Section>
        </fieldset>
      </form>
      <aside id="portfolio-preview" tabIndex={-1} className="min-w-0 xl:sticky xl:top-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-foreground">Live preview</h2><span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-muted-foreground">Only you can see this preview</span></div>
        <p className="mb-4 text-sm leading-6 text-muted-foreground">This shows your current form, including unsaved edits. Your public page changes only when you publish.</p>
        <div className="overflow-hidden rounded-lg border border-border bg-white xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto"><PortfolioPreview data={data} theme={data.theme ?? "simple"} headingLevel={2} preview /></div>
      </aside>
    </div>
    <dialog ref={dialog} aria-labelledby="portfolio-confirm-title" className="m-auto max-w-md rounded-lg border border-border bg-white p-6 text-foreground shadow-xl backdrop:bg-slate-950/50">
      <h2 id="portfolio-confirm-title" className="text-xl font-bold">{dialogKind === "delete" ? "Delete your portfolio?" : "Replace unsaved edits?"}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{dialogKind === "delete" ? "This removes your saved draft and public page, and releases your username. Your question-practice history and Google account are unchanged." : "Loading the latest saved draft replaces the details currently in this form. Your unsaved edits will be lost."}</p>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" className={secondaryAction} onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className={dialogKind === "delete" ? `${secondaryAction} text-rose-700` : primaryAction} onClick={() => {
        dialog.current?.close();
        if (dialogKind === "reload") { loadLatest(); return; }
        if (!record) return;
        void run(async () => { await api().delete(record.revision); if (!mounted.current) return; dirtyRef.current = false; setRecord(null); setData({}); setSearchVisible(false); setUsername(""); setEligible(false); setSavedFingerprint(fingerprint({}, false)); }, "Portfolio deleted. Its public address is no longer active.");
      }}>{dialogKind === "delete" ? "Confirm deletion" : "Load saved draft"}</button></div>
    </dialog>
  </>;
}
