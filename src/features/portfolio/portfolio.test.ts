import { test } from "node:test";
import assert from "node:assert/strict";
import fixtures from "../../../shared/portfolio/fixtures.json" with { type: "json" };
import { PORTFOLIO_RULES } from "./rules.ts";
import {
  problemKey,
  validatePortfolio,
  validateUsername,
} from "./validation.ts";
import type { PortfolioMode } from "./types.ts";

// The backend runs the same fixtures (PortfolioValidatorTests). Add a case there first when
// a rule changes, so both runtimes keep agreeing.

const keys = (problems: Parameters<typeof problemKey>[0][]) =>
  problems.map(problemKey).sort();

test("every shared username fixture gives the expected problems", () => {
  for (const fixture of fixtures.usernames)
    assert.deepEqual(
      keys(validateUsername(fixture.value)),
      [...fixture.problems].sort(),
      fixture.name,
    );
});

test("every shared portfolio fixture gives the expected problems", () => {
  for (const fixture of fixtures.portfolios)
    assert.deepEqual(
      keys(validatePortfolio(fixture.value, fixture.mode as PortfolioMode)),
      [...fixture.problems].sort(),
      fixture.name,
    );
});

// Text with a lone surrogate cannot be stored in JSON that .NET parses, so these fixtures list
// the UTF-16 code units and each runtime builds the string itself.
test("every malformed-text fixture gives the expected problems", () => {
  assert.ok(fixtures.malformedText.length > 0);
  for (const fixture of fixtures.malformedText) {
    const text = String.fromCharCode(...fixture.codeUnits);
    const problems =
      fixture.field === "username"
        ? validateUsername(text)
        : validatePortfolio(portfolioWith(fixture.field, text), "draft");
    assert.deepEqual(keys(problems), [...fixture.problems].sort(), fixture.name);
  }
});

function portfolioWith(field: string, text: string): unknown {
  switch (field) {
    case "name": return { name: text };
    case "about": return { about: text };
    case "skill": return { skills: [text] };
    case "projectLink": return { projects: [{ title: "App", link: text }] };
    case "website": return { links: { website: text } };
    case "email": return { links: { email: text } };
    case "key": return { [text]: 1 };
    case "linksKey": return { links: { [text]: 1 } };
    case "projectKey": return { projects: [{ title: "App", [text]: 1 }] };
    default: throw new Error(`Unknown fixture field: ${field}`);
  }
}

test("lone surrogate escapes in parsed JSON text are problems", () => {
  // The backslash comes from a char code so this source never holds a surrogate escape.
  const escape = (hex: string) => String.fromCharCode(92) + "u" + hex;
  const values = '{"name":"' + escape("d800") + '","skills":["' + escape("dc00") + '"]}';
  assert.deepEqual(keys(validatePortfolio(JSON.parse(values), "draft")), [
    "name:invalid-characters",
    "skills[0]:invalid-characters",
  ]);
  const name = '{"links":{"' + escape("d800") + '":1}}';
  assert.deepEqual(keys(validatePortfolio(JSON.parse(name), "draft")), ["links:invalid-characters"]);
});

test("the fixtures cover valid and invalid input and both modes", () => {
  assert.ok(fixtures.usernames.some((f) => f.problems.length === 0));
  assert.ok(fixtures.usernames.some((f) => f.problems.length > 0));
  assert.ok(fixtures.portfolios.some((f) => f.mode === "draft"));
  assert.ok(fixtures.portfolios.some((f) => f.mode === "publish"));
  assert.ok(fixtures.portfolios.some((f) => f.problems.length === 0));
});

test("every problem code the validator can report appears in a fixture", () => {
  const seen = new Set(
    [...fixtures.usernames, ...fixtures.portfolios].flatMap((f) =>
      f.problems.map((p) => p.split(":")[1]),
    ),
  );
  for (const code of [
    "required",
    "invalid-type",
    "unknown-field",
    "too-short",
    "too-long",
    "too-many",
    "invalid-characters",
    "html-like",
    "invalid-format",
    "invalid-link",
    "invalid-host",
    "invalid-email",
    "reserved",
    "blocked-word",
  ])
    assert.ok(seen.has(code), `no fixture produces ${code}`);
});

test("reserved names cover every public route and the names listed in ADR 0002", () => {
  const reserved = new Set(PORTFOLIO_RULES.username.reserved);
  for (const name of [
    "www", "api", "app", "admin", "mail", "docs", "blog", "login", "support",
    "help", "procoderji", "satyam", "u", "learn", "practice", "account",
    "dashboard", "games", "guides", "jobs", "about", "privacy", "terms",
    "disclaimer", "copyright", "courses",
  ])
    assert.ok(reserved.has(name), name);
});

test("reserved names and blocked words are well-formed usernames in lowercase", () => {
  const pattern = new RegExp(PORTFOLIO_RULES.username.pattern);
  for (const name of PORTFOLIO_RULES.username.reserved)
    assert.ok(pattern.test(name), `reserved name ${name} can never be claimed anyway`);
  for (const word of PORTFOLIO_RULES.username.blockedWords)
    assert.ok(/^[a-z0-9]+$/.test(word), `blocked word ${word} must be lowercase letters and digits`);
});

test("every limit in the rules is a positive whole number", () => {
  for (const [key, max] of Object.entries(PORTFOLIO_RULES.maxLength))
    assert.ok(Number.isInteger(max) && max > 0, key);
  for (const [key, max] of Object.entries(PORTFOLIO_RULES.maxItems))
    assert.ok(Number.isInteger(max) && max > 0, key);
});

test("validating does not modify the input", () => {
  const input = { name: "Riya", skills: ["a"], links: { github: "https://github.com/riya" } };
  const copy = structuredClone(input);
  validatePortfolio(input, "publish");
  assert.deepEqual(input, copy);
});

test("a huge value of the wrong type is rejected quickly", () => {
  const started = Date.now();
  assert.deepEqual(keys(validatePortfolio({ name: "x".repeat(2_000_000) }, "draft")), ["name:too-long"]);
  assert.deepEqual(keys(validatePortfolio({ links: { github: "https://" + "a".repeat(2_000_000) } }, "draft")), ["links.github:too-long"]);
  assert.ok(Date.now() - started < 1_000);
});
