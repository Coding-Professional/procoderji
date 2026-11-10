import { PORTFOLIO_RULES as RULES } from "./rules.ts";
import type {
  PortfolioMode,
  PortfolioProblem,
  PortfolioProblemCode,
} from "./types.ts";

/*
 * Portfolio validation. The .NET validator in
 * backend/src/ProCoderJi.Api/Features/Portfolio/ implements the same rules, and both run
 * against shared/portfolio/fixtures.json. Keep the two in step: when a check changes, add a
 * fixture first. The rules avoid URL parsers and locale-aware string functions on purpose,
 * because those behave differently in JavaScript and .NET.
 */

const CONTROL = new RegExp(RULES.text.controlCharacters);
const HTML_LIKE = new RegExp(RULES.text.htmlLike);
const LINK_FORBIDDEN = new RegExp(RULES.link.forbiddenCharacters);
const HOST = new RegExp(RULES.link.hostPattern);
const EMAIL = new RegExp(RULES.emailPattern);
const USERNAME = new RegExp(RULES.username.pattern);
const RESERVED = new Set(RULES.username.reserved);
const MULTILINE = new Set(RULES.multilineFields);
const BLANK = /^[ \t\r\n]*$/;
const LINE_BREAK = /[\r\n]/;
const AUTHORITY_END = /[/?#]/;

type Problems = PortfolioProblem[];
type Value = unknown;
type ItemCheck = (path: string, item: Value) => void;

function add(problems: Problems, path: string, code: PortfolioProblemCode) {
  problems.push({ path, code });
}

function limit(table: Readonly<Record<string, number>>, key: string): number {
  const value = table[key];
  if (value === undefined) throw new Error(`Missing portfolio rule: ${key}`);
  return value;
}

/** Lower-cases A-Z only, so other characters such as the Kelvin sign are never folded. */
function asciiLower(text: string): string {
  return text.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

function isObject(value: Value): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function get(object: Record<string, unknown>, key: string): Value {
  return Object.hasOwn(object, key) ? object[key] : undefined;
}

function checkUnknownFields(
  problems: Problems,
  path: string,
  object: Record<string, unknown>,
  allowed: readonly string[],
) {
  for (const key of Object.keys(object))
    if (!allowed.includes(key))
      add(problems, path ? `${path}.${key}` : key, "unknown-field");
}

function checkText(
  problems: Problems,
  path: string,
  value: Value,
  key: string,
  required: boolean,
) {
  if (value === undefined) {
    if (required) add(problems, path, "required");
    return;
  }
  if (typeof value !== "string") return add(problems, path, "invalid-type");
  if (BLANK.test(value)) {
    if (required) add(problems, path, "required");
    return;
  }
  if (value.length > limit(RULES.maxLength, key)) return add(problems, path, "too-long");
  if (CONTROL.test(value) || (!MULTILINE.has(key) && LINE_BREAK.test(value)))
    return add(problems, path, "invalid-characters");
  if (HTML_LIKE.test(value)) add(problems, path, "html-like");
}

/** An optional https link. `hostKey` selects the host restriction, such as `links.github`. */
function checkLink(
  problems: Problems,
  path: string,
  value: Value,
  hostKey?: string,
) {
  if (value === undefined) return;
  if (typeof value !== "string") return add(problems, path, "invalid-type");
  if (BLANK.test(value)) return;
  if (value.length > limit(RULES.maxLength, "link")) return add(problems, path, "too-long");
  const scheme = RULES.link.scheme;
  if (
    LINK_FORBIDDEN.test(value) ||
    asciiLower(value.slice(0, scheme.length)) !== scheme
  )
    return add(problems, path, "invalid-link");
  const rest = value.slice(scheme.length);
  const end = rest.search(AUTHORITY_END);
  const authority = end === -1 ? rest : rest.slice(0, end);
  // The host pattern allows only letters, digits, hyphens and dots, so credentials
  // (`user@host`), ports (`host:8443`), IP literals and empty hosts all fail it.
  const host = asciiLower(authority);
  if (!HOST.test(host)) return add(problems, path, "invalid-link");
  const allowed = hostKey ? RULES.link.hostRestrictions[hostKey] : undefined;
  if (allowed && !allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)))
    add(problems, path, "invalid-host");
}

function checkEmail(problems: Problems, path: string, value: Value) {
  if (value === undefined) return;
  if (typeof value !== "string") return add(problems, path, "invalid-type");
  if (BLANK.test(value)) return;
  if (value.length > limit(RULES.maxLength, "email")) return add(problems, path, "too-long");
  if (!EMAIL.test(value)) add(problems, path, "invalid-email");
}

function checkList(
  problems: Problems,
  path: string,
  value: Value,
  key: string,
  checkItem: ItemCheck,
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) return add(problems, path, "invalid-type");
  if (value.length > limit(RULES.maxItems, key)) return add(problems, path, "too-many");
  value.forEach((item, index) => checkItem(`${path}[${index}]`, item));
}

function checkObjectItem(
  problems: Problems,
  path: string,
  item: Value,
  allowed: readonly string[],
  checkFields: (object: Record<string, unknown>) => void,
) {
  if (!isObject(item)) return add(problems, path, "invalid-type");
  checkUnknownFields(problems, path, item, allowed);
  checkFields(item);
}

/** Checks a username for the public address `/u/<username>`. */
export function validateUsername(value: unknown): PortfolioProblem[] {
  const problems: Problems = [];
  const path = "username";
  const rules = RULES.username;
  if (typeof value !== "string") return [{ path, code: "invalid-type" }];
  if (BLANK.test(value)) return [{ path, code: "required" }];
  if (value.length < rules.minLength) return [{ path, code: "too-short" }];
  if (value.length > rules.maxLength) return [{ path, code: "too-long" }];
  if (!USERNAME.test(value)) return [{ path, code: "invalid-format" }];
  if (RESERVED.has(value)) return [{ path, code: "reserved" }];
  const squashed = value.replaceAll("-", "");
  if (rules.blockedWords.some((word) => squashed.includes(word)))
    add(problems, path, "blocked-word");
  return problems;
}

/**
 * Checks untrusted portfolio data. A draft only has to be well-formed; publishing also needs
 * the fields listed in `requiredForPublish`. An empty result means the data is valid.
 */
export function validatePortfolio(
  value: unknown,
  mode: PortfolioMode,
): PortfolioProblem[] {
  const problems: Problems = [];
  if (!isObject(value)) return [{ path: "$", code: "invalid-type" }];
  checkUnknownFields(problems, "", value, [
    "name",
    "headline",
    "about",
    "skills",
    "projects",
    "education",
    "experience",
    "achievements",
    "links",
  ]);

  const requiredOnPublish = (key: string) =>
    mode === "publish" && RULES.requiredForPublish.includes(key);
  checkText(problems, "name", get(value, "name"), "name", requiredOnPublish("name"));
  checkText(problems, "headline", get(value, "headline"), "headline", requiredOnPublish("headline"));
  checkText(problems, "about", get(value, "about"), "about", false);

  checkList(problems, "skills", get(value, "skills"), "skills", (path, item) =>
    checkText(problems, path, item, "skills.item", true),
  );

  checkList(problems, "projects", get(value, "projects"), "projects", (path, item) =>
    checkObjectItem(problems, path, item, ["title", "link", "technologies", "description"], (project) => {
      checkText(problems, `${path}.title`, get(project, "title"), "projects.title", true);
      checkLink(problems, `${path}.link`, get(project, "link"));
      checkList(problems, `${path}.technologies`, get(project, "technologies"), "projects.technologies", (techPath, tech) =>
        checkText(problems, techPath, tech, "projects.technologies.item", true),
      );
      checkText(problems, `${path}.description`, get(project, "description"), "projects.description", false);
    }),
  );

  checkList(problems, "education", get(value, "education"), "education", (path, item) =>
    checkObjectItem(problems, path, item, ["institution", "degree", "period", "details"], (entry) => {
      checkText(problems, `${path}.institution`, get(entry, "institution"), "education.institution", true);
      checkText(problems, `${path}.degree`, get(entry, "degree"), "education.degree", false);
      checkText(problems, `${path}.period`, get(entry, "period"), "education.period", false);
      checkText(problems, `${path}.details`, get(entry, "details"), "education.details", false);
    }),
  );

  checkList(problems, "experience", get(value, "experience"), "experience", (path, item) =>
    checkObjectItem(problems, path, item, ["organization", "role", "period", "description"], (entry) => {
      checkText(problems, `${path}.organization`, get(entry, "organization"), "experience.organization", true);
      checkText(problems, `${path}.role`, get(entry, "role"), "experience.role", true);
      checkText(problems, `${path}.period`, get(entry, "period"), "experience.period", false);
      checkText(problems, `${path}.description`, get(entry, "description"), "experience.description", false);
    }),
  );

  checkList(problems, "achievements", get(value, "achievements"), "achievements", (path, item) =>
    checkText(problems, path, item, "achievements.item", true),
  );

  const links = get(value, "links");
  if (links !== undefined) {
    if (!isObject(links)) add(problems, "links", "invalid-type");
    else {
      checkUnknownFields(problems, "links", links, ["github", "linkedin", "website", "email"]);
      checkLink(problems, "links.github", get(links, "github"), "links.github");
      checkLink(problems, "links.linkedin", get(links, "linkedin"), "links.linkedin");
      checkLink(problems, "links.website", get(links, "website"));
      checkEmail(problems, "links.email", get(links, "email"));
    }
  }
  return problems;
}

/** The stable `path:code` form used by the shared fixtures and for messages. */
export function problemKey(problem: PortfolioProblem): string {
  return `${problem.path}:${problem.code}`;
}
