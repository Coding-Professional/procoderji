import type {
  PortfolioData,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioProject,
} from "./types.ts";
import { validatePortfolio } from "./validation.ts";

export const PORTFOLIO_MARKDOWN_MAX_BYTES = 50 * 1024;

export const PORTFOLIO_MARKDOWN_AI_PROMPT =
  "Fill the ProCoderJii portfolio.md template using only the details I provide. " +
  "Keep every front-matter key and section heading exactly as it is. " +
  "Keep the name, headline and theme in front matter, and use the labelled fields in each entry. " +
  "Use simple or developer for theme, https links, and a plain email address if I choose to share it. " +
  "Keep Technologies as a JSON array of strings. Do not add HTML, JSX, JavaScript expressions, code fences or new sections. " +
  "Remove sample entries that do not apply and leave their section headings empty. " +
  "Do not invent experience, qualifications or achievements. Return only the completed Markdown file; I will review it before saving.";

export interface PortfolioMarkdownProblem {
  path: string;
  code: string;
  message: string;
  line?: number;
}

export type PortfolioMarkdownResult =
  | { ok: true; data: PortfolioData; problems: [] }
  | { ok: false; problems: PortfolioMarkdownProblem[] };

const SECTIONS = ["About", "Skills", "Projects", "Education", "Experience", "Achievements"] as const;
type Section = (typeof SECTIONS)[number];
const FRONT_FIELDS = ["name", "headline", "theme", "github", "linkedin", "website", "email"];
const ENTRY_FIELDS = {
  Projects: { link: "link", technologies: "technologies", description: "description" },
  Education: { degree: "degree", period: "period", details: "details" },
  Experience: { role: "role", period: "period", description: "description" },
} as const;
type EntrySection = keyof typeof ENTRY_FIELDS;
interface Line { text: string; number: number }
const MULTILINE = new Set(["description", "details"]);

function problem(path: string, code: string, message: string, line?: number): PortfolioMarkdownProblem {
  return { path, code, message, ...(line === undefined ? {} : { line }) };
}

function wellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

/** Decode only Markdown punctuation escapes, never HTML entities or executable markup. */
function unescapeText(value: string): string {
  return value.replace(/\\([\\{}#*\[\]_])/g, "$1");
}

function hasExpression(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "\\") { index++; continue; }
    if (value[index] === "{" || value[index] === "}") return true;
  }
  return false;
}

function plainText(value: string, path: string, line: number, problems: PortfolioMarkdownProblem[]): string | undefined {
  if (hasExpression(value)) {
    problems.push(problem(path, "unsafe-markdown", "JavaScript expressions are not supported. Escape literal braces with a backslash.", line));
    return undefined;
  }
  return unescapeText(value);
}

/** A deliberately small scalar grammar, not a YAML object loader. */
function scalar(value: string, path: string, line: number, problems: PortfolioMarkdownProblem[]): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch { /* Report the format below. */ }
    problems.push(problem(path, "invalid-format", "Use a plain value or a valid double-quoted JSON string.", line));
    return undefined;
  }
  if (trimmed.startsWith("'")) {
    if (/^'(?:[^']|'')*'$/.test(trimmed)) return trimmed.slice(1, -1).replaceAll("''", "'");
    problems.push(problem(path, "invalid-format", "Close the quoted value; double a quote inside a single-quoted value.", line));
    return undefined;
  }
  if (/^[!&*|>\[{]/.test(trimmed)) {
    problems.push(problem(path, "unsupported-value", "Use a plain scalar value. YAML tags, aliases, objects and arrays are not supported here.", line));
    return undefined;
  }
  return plainText(trimmed, path, line, problems);
}

function trimBlankLines(lines: Line[]): Line[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].text.trim()) start++;
  while (end > start && !lines[end - 1].text.trim()) end--;
  return lines.slice(start, end);
}

function bullets(lines: Line[], path: string, problems: PortfolioMarkdownProblem[]): string[] | undefined {
  const items: string[] = [];
  for (const line of lines) {
    if (!line.text.trim()) continue;
    const match = /^- (.+)$/.exec(line.text);
    if (!match) {
      problems.push(problem(path, "invalid-format", "Use one '- item' line per entry.", line.number));
      continue;
    }
    const value = scalar(match[1], `${path}[${items.length}]`, line.number, problems);
    if (value !== undefined) items.push(value);
  }
  return items.length ? items : undefined;
}

function entries(lines: Line[], section: EntrySection, problems: PortfolioMarkdownProblem[]): Record<string, unknown>[] | undefined {
  const path = section.toLowerCase();
  const titleKey = section === "Projects" ? "title" : section === "Education" ? "institution" : "organization";
  const allowed: Readonly<Record<string, string>> = ENTRY_FIELDS[section];
  const result: Record<string, unknown>[] = [];
  let item: Record<string, unknown> | undefined;
  let fields = new Set<string>();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.text.trim()) continue;
    const heading = /^### (.+)$/.exec(line.text);
    if (heading) {
      const title = scalar(heading[1], `${path}[${result.length}].${titleKey}`, line.number, problems);
      item = { [titleKey]: title ?? "" };
      result.push(item);
      fields = new Set();
      continue;
    }
    const itemPath = `${path}[${Math.max(0, result.length - 1)}]`;
    if (!item) {
      problems.push(problem(path, "invalid-format", "Start each entry with a '### Title' heading.", line.number));
      continue;
    }
    const field = /^([A-Za-z][A-Za-z ]*):(?:[ \t]*(.*))$/.exec(line.text);
    if (!field) {
      problems.push(problem(itemPath, "invalid-format", "Use the template's labelled fields; indent continuation text by two spaces.", line.number));
      continue;
    }
    const fieldName = field[1].toLowerCase();
    const key = Object.hasOwn(allowed, fieldName) ? allowed[fieldName] : undefined;
    if (!key) {
      problems.push(problem(`${itemPath}.${field[1]}`, "unknown-field", `Unknown field '${field[1]}' in ${section}.`, line.number));
      continue;
    }
    if (fields.has(key)) {
      problems.push(problem(`${itemPath}.${key}`, "duplicate-field", `The '${field[1]}' field appears more than once.`, line.number));
      continue;
    }
    fields.add(key);
    if (key === "technologies") {
      if (!field[2].trim()) continue;
      try {
        const value: unknown = JSON.parse(field[2]);
        if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
          item[key] = value;
          continue;
        }
      } catch { /* Report an actionable array error. */ }
      problems.push(problem(`${itemPath}.${key}`, "invalid-format", 'Write Technologies as a JSON list such as ["TypeScript", "C#"].', line.number));
      continue;
    }
    if (MULTILINE.has(key) && (field[2].trim() === "|" || !field[2].trim())) {
      const body: Line[] = [];
      while (index + 1 < lines.length && (lines[index + 1].text.startsWith("  ") || !lines[index + 1].text.trim())) {
        const next = lines[++index];
        body.push({ text: next.text.startsWith("  ") ? next.text.slice(2) : "", number: next.number });
      }
      const text = trimBlankLines(body).map((entry) => entry.text).join("\n");
      const value = text ? plainText(text, `${itemPath}.${key}`, line.number, problems) : undefined;
      if (value !== undefined) item[key] = value;
    } else {
      const value = scalar(field[2], `${itemPath}.${key}`, line.number, problems);
      if (value !== undefined) item[key] = value;
    }
  }
  return result.length ? result : undefined;
}

/** Parse the import format into draft data only. Nothing is rendered, stored or published. */
export function parsePortfolioMarkdown(source: unknown): PortfolioMarkdownResult {
  const problems: PortfolioMarkdownProblem[] = [];
  if (typeof source !== "string") return { ok: false, problems: [problem("$", "invalid-type", "Choose a UTF-8 Markdown text file.")] };
  if (source.length > PORTFOLIO_MARKDOWN_MAX_BYTES || new TextEncoder().encode(source).byteLength > PORTFOLIO_MARKDOWN_MAX_BYTES)
    return { ok: false, problems: [problem("$", "too-large", "The Markdown file must be 50 KiB or smaller.")] };
  if (!wellFormed(source) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(source))
    return { ok: false, problems: [problem("$", "invalid-text", "Use well-formed UTF-8 text without control characters.")] };
  if (/<(?:[A-Za-z/!?]|>)/.test(source))
    return { ok: false, problems: [problem("$", "unsafe-markdown", "HTML and JSX are not allowed in portfolio imports.")] };
  if (/^\s*(?:`{3,}|~{3,})/m.test(source) || /^\s*(?:import|export)\s/m.test(source))
    return { ok: false, problems: [problem("$", "unsafe-markdown", "Code fences and JavaScript import/export statements are not supported.")] };

  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n").map((text, index) => ({ text, number: index + 1 }));
  if (lines[0]?.text !== "---")
    return { ok: false, problems: [problem("$", "missing-front-matter", "Start with the template's --- front matter block.", 1)] };
  const end = lines.findIndex((line, index) => index > 0 && line.text === "---");
  if (end === -1)
    return { ok: false, problems: [problem("$", "missing-front-matter", "Close the front matter with a second --- line.", 1)] };
  const data: Record<string, unknown> = {};
  const links: Record<string, string> = {};
  const frontFields = new Set<string>();
  for (const line of lines.slice(1, end)) {
    if (!line.text.trim()) continue;
    const match = /^([a-z][a-z0-9]*):(?:[ \t]*(.*))$/.exec(line.text);
    if (!match || !FRONT_FIELDS.includes(match[1])) {
      problems.push(problem("frontMatter", "unknown-field", "Use only the front-matter keys from the template.", line.number));
      continue;
    }
    const key = match[1];
    if (frontFields.has(key)) {
      problems.push(problem(key, "duplicate-field", `The '${key}' field appears more than once.`, line.number));
      continue;
    }
    frontFields.add(key);
    const value = scalar(match[2], key, line.number, problems);
    if (value !== undefined) {
      if (["github", "linkedin", "website", "email"].includes(key)) links[key] = value;
      else data[key] = value;
    }
  }
  if (Object.keys(links).length) data.links = links;

  const sections = new Map<Section, Line[]>();
  let current: Line[] | undefined;
  for (const line of lines.slice(end + 1)) {
    if (line.text === "# Portfolio" && !current && sections.size === 0) continue;
    const heading = /^## (.+)$/.exec(line.text);
    if (heading) {
      if (!SECTIONS.includes(heading[1] as Section)) {
        problems.push(problem(heading[1], "unknown-section", `Unknown section '${heading[1]}'. Keep the template headings unchanged.`, line.number));
        current = undefined;
      } else if (sections.has(heading[1] as Section)) {
        problems.push(problem(heading[1], "duplicate-section", `The '${heading[1]}' section appears more than once.`, line.number));
        current = undefined;
      } else {
        current = [];
        sections.set(heading[1] as Section, current);
      }
    } else if (/^#{1,6}(?:\s|$)/.test(line.text) && !/^### .+/.test(line.text)) {
      problems.push(problem("$", "unknown-section", "Use the template's ## sections and ### entry headings.", line.number));
    } else if (current) current.push(line);
    else if (line.text.trim()) problems.push(problem("$", "outside-section", "Place this text inside a known section.", line.number));
  }
  for (const section of SECTIONS)
    if (!sections.has(section)) problems.push(problem(section, "missing-section", `The '${section}' heading is missing. Leave it empty if it does not apply.`));
  const aboutLines = trimBlankLines(sections.get("About") ?? []);
  if (aboutLines.some((line) => /^### /.test(line.text)))
    problems.push(problem("about", "unknown-section", "The About section does not have entry subheadings."));
  if (aboutLines.length) {
    const value = plainText(aboutLines.map((line) => line.text).join("\n"), "about", aboutLines[0].number, problems);
    if (value !== undefined) data.about = value;
  }
  const skills = bullets(sections.get("Skills") ?? [], "skills", problems);
  const achievements = bullets(sections.get("Achievements") ?? [], "achievements", problems);
  if (skills) data.skills = skills;
  if (achievements) data.achievements = achievements;
  for (const section of ["Projects", "Education", "Experience"] as const) {
    const values = entries(sections.get(section) ?? [], section, problems);
    if (values) data[section.toLowerCase()] = values;
  }
  if (problems.length) return { ok: false, problems };
  const validation = validatePortfolio(data, "draft");
  if (validation.length) return { ok: false, problems: validation.map((entry) => problem(entry.path, entry.code, `Correct '${entry.path}': ${entry.code.replaceAll("-", " ")}.`)) };
  return { ok: true, data: data as PortfolioData, problems: [] };
}

function escaped(value: string): string {
  return value.replaceAll("\\", "\\\\").replace(/[{}]/g, "\\$&").replace(/^(#{1,6})(?=\s|$)/gm, "\\$1");
}

/** Serialize the supported fields into the documented review/import format. */
export function portfolioToMarkdown(data: PortfolioData): string {
  const front = ["---", `name: ${JSON.stringify(data.name ?? "")}`, `headline: ${JSON.stringify(data.headline ?? "")}`];
  const theme = data.theme;
  if (theme !== undefined) front.push(`theme: ${JSON.stringify(theme)}`);
  for (const key of ["github", "linkedin", "website", "email"] as const)
    if (data.links?.[key] !== undefined) front.push(`${key}: ${JSON.stringify(data.links[key])}`);
  front.push("---", "", "# Portfolio", "", "## About", "", escaped(data.about ?? ""), "", "## Skills", "");
  const output = [...front, ...(data.skills ?? []).map((value) => `- ${JSON.stringify(value)}`), "", "## Projects", ""];
  function addEntries(values: (PortfolioProject | PortfolioEducation | PortfolioExperience)[], kind: EntrySection) {
    for (const value of values) {
      const record = value as unknown as Record<string, unknown>;
      const title = kind === "Projects" ? "title" : kind === "Education" ? "institution" : "organization";
      output.push(`### ${JSON.stringify(record[title])}`);
      for (const [label, key] of Object.entries(ENTRY_FIELDS[kind])) {
        if (record[key] === undefined) continue;
        output.push(`${label[0].toUpperCase() + label.slice(1)}: ${JSON.stringify(record[key])}`);
      }
      output.push("");
    }
  }
  addEntries(data.projects ?? [], "Projects");
  output.push("## Education", "");
  addEntries(data.education ?? [], "Education");
  output.push("## Experience", "");
  addEntries(data.experience ?? [], "Experience");
  output.push("## Achievements", "", ...(data.achievements ?? []).map((value) => `- ${JSON.stringify(value)}`), "");
  return output.join("\n");
}
