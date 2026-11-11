import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parsePortfolioMarkdown,
  portfolioToMarkdown,
  PORTFOLIO_MARKDOWN_AI_PROMPT,
  PORTFOLIO_MARKDOWN_MAX_BYTES,
} from "./markdown.ts";
import type { PortfolioData } from "./types.ts";

const template = fs.readFileSync("public/templates/portfolio.md", "utf8");
const example: PortfolioData = {
  name: "Riya Student",
  headline: "Computer science student building useful web applications",
  about: "I enjoy building small applications that help other students learn. Replace these sample details with your own before saving.",
  skills: ["TypeScript", "C#", "PostgreSQL"],
  projects: [{ title: "Campus Notes", link: "https://github.com/example/campus-notes", technologies: ["TypeScript", "Next.js"], description: "Built a small notes catalogue with keyboard navigation." }],
  education: [{ institution: "Example Institute", degree: "B.Tech in Computer Science", period: "2023–2027", details: "Studying databases and software engineering." }],
  experience: [{ organization: "Student Computing Club", role: "Volunteer Developer", period: "2025–2026", description: "Helped classmates publish reviewed study material." }],
  achievements: ["Built a student project with a small team."],
  links: { github: "https://github.com/example", linkedin: "https://linkedin.com/in/example-student", website: "https://example.com", email: "riya@example.com" },
};

function mustParse(source: string): PortfolioData {
  const result = parsePortfolioMarkdown(source);
  assert.equal(result.ok, true, JSON.stringify(result.problems));
  if (!result.ok) throw new Error("Expected valid import");
  return result.data;
}

test("the downloadable template imports every supported portfolio section and round-trips", () => {
  const expected = { ...example, theme: "simple" };
  const parsed = mustParse(template);
  assert.deepEqual(parsed, expected);
  assert.deepEqual(mustParse(portfolioToMarkdown(parsed)), expected);
  assert.deepEqual(mustParse(template.replaceAll("\n", "\r\n")), expected);
});

test("missing and unknown sections fail explicitly instead of dropping student content", () => {
  const missing = parsePortfolioMarkdown(template.replace("## Education", "Education"));
  assert.equal(missing.ok, false);
  assert.ok(missing.problems.some((entry) => entry.code === "missing-section" && entry.path === "Education"));
  const extra = parsePortfolioMarkdown(template + "\n## Awards\n- A prize\n");
  assert.equal(extra.ok, false);
  assert.ok(extra.problems.some((entry) => entry.code === "unknown-section" && entry.path === "Awards"));
  assert.ok(extra.problems.some((entry) => entry.line !== undefined));
  const duplicate = parsePortfolioMarkdown(template + "\n## Skills\n- Java\n");
  assert.ok(duplicate.problems.some((entry) => entry.code === "duplicate-section"));
});

test("HTML, JSX, executable expressions and fenced code are rejected before creating data", () => {
  for (const text of ["<script>alert(1)</script>", "<Image src='x' />", "<>fragment</>", "{process.env.TOKEN}", "```js\nalert(1)\n```", "import something from 'elsewhere'"]) {
    const result = parsePortfolioMarkdown(template.replace("I enjoy building small applications", text + "\nI enjoy building small applications"));
    assert.equal(result.ok, false, text);
    assert.ok(result.problems.some((entry) => entry.code === "unsafe-markdown"), text);
    assert.ok(!Object.hasOwn(result, "data"));
  }
});

test("shared link, field, nested required-value and theme rules apply to imports", () => {
  for (const [from, to, path, code] of [
    ["https://github.com/example/campus-notes", "javascript:alert(1)", "projects[0].link", "invalid-link"],
    ["https://github.com/example\n", "https://evil.example\n", "links.github", "invalid-host"],
    ["Role: Volunteer Developer", "Role:", "experience[0].role", "required"],
    ["theme: simple", "theme: custom", "theme", "invalid-format"],
  ]) {
    const result = parsePortfolioMarkdown(template.replace(from, to));
    assert.equal(result.ok, false, to);
    assert.ok(result.problems.some((entry) => entry.path === path && entry.code === code), JSON.stringify(result.problems));
  }
});

test("empty optional sections import as a draft, and multiline entry text stays plain text", () => {
  const source = "---\nname: Riya\nheadline: Student\n---\n\n## About\n\n## Skills\n\n## Projects\n\n## Education\n\n## Experience\n\n## Achievements\n";
  assert.deepEqual(mustParse(source), { name: "Riya", headline: "Student" });
  const result = mustParse(template.replace("Description: Built a small notes catalogue with keyboard navigation.", "Description: |\n  Built a small catalogue.\n  Supports keyboard navigation."));
  assert.equal(result.projects?.[0].description, "Built a small catalogue.\nSupports keyboard navigation.");
});

test("import rejects malformed/duplicate metadata, unexpected fields and unsupported YAML without object construction", () => {
  for (const source of [
    template.replace("name: \"Riya Student\"", "name: \"Riya Student\"\nname: Other"),
    template.replace("theme: simple", "theme: simple\n__proto__: bad"),
    template.replace("theme: simple", "theme: !javascript bad"),
    template.replace("Link: https://github.com/example/campus-notes", "Constructor: surprise"),
    template.replace('Technologies: ["TypeScript", "Next.js"]', "Technologies: TypeScript, Next.js"),
    template.replace('name: "Riya Student"', 'name: "unclosed'),
  ]) {
    const result = parsePortfolioMarkdown(source);
    assert.equal(result.ok, false);
    assert.ok(result.problems.length > 0);
  }
  assert.equal(({} as Record<string, unknown>).bad, undefined);
});

test("the size cap counts UTF-8 bytes before parsing and malformed text is rejected", () => {
  assert.equal(PORTFOLIO_MARKDOWN_MAX_BYTES, 50 * 1024);
  for (const source of [" ".repeat(PORTFOLIO_MARKDOWN_MAX_BYTES + 1), "अ".repeat(18_000)]) {
    const result = parsePortfolioMarkdown(source);
    assert.equal(result.ok, false);
    assert.equal(result.problems[0].code, "too-large");
  }
  for (const source of [template + "\0", template + String.fromCharCode(0xd800)]) {
    const result = parsePortfolioMarkdown(source);
    assert.equal(result.ok, false);
    assert.equal(result.problems[0].code, "invalid-text");
  }
  assert.equal(parsePortfolioMarkdown(null).ok, false);
  assert.ok(PORTFOLIO_MARKDOWN_AI_PROMPT.includes("review"));
});

test("serialization escapes literal Markdown structure and preserves quoted Unicode and braces", () => {
  const data: PortfolioData = {
    name: 'Riya "विद्यार्थी"', headline: "Student", about: "I use objects \\ and {values}.\n## This is text, not a section",
    skills: ["C#", "CSS {grid}"],
    projects: [{ title: "A project", description: "An object {value} in plain quoted text." }],
  };
  assert.deepEqual(mustParse(portfolioToMarkdown(data)), data);
});
