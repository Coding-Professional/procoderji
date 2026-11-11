import assert from "node:assert/strict";
import { test } from "node:test";
import { concisePortfolioText, portfolioInitials, portfolioProfileLinks, portfolioProjectHref } from "./presentation.ts";

test("initials use bounded Unicode characters and no remote avatar", () => {
  assert.equal(portfolioInitials("Riya Sharma"), "RS");
  assert.equal(portfolioInitials("  Riya   " ), "RI");
  assert.equal(portfolioInitials("李 明"), "李明");
  assert.equal(portfolioInitials(undefined), "ST");
  assert.equal(portfolioInitials("🙂"), "ST");
});

test("incomplete editor links cannot become executable or non-https anchors", () => {
  for (const value of [undefined, "", " ", "javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:secret@example.com", "https://example.com\\evil", "https://example.com\n"]) {
    assert.equal(portfolioProjectHref(value), null, String(value));
  }
  assert.equal(portfolioProjectHref("https://example.com/project?tab=code#readme"), "https://example.com/project?tab=code#readme");
});

test("contact links retain host restrictions and safely encode literal percent signs in email addresses", () => {
  const links = portfolioProfileLinks({ links: {
    github: "https://github.com/riya",
    linkedin: "https://example.com/impersonation",
    website: "javascript:alert(1)",
    email: "student%0aBcc@example.com",
  } });
  assert.deepEqual(links.map((link) => link.label), ["GitHub", "student%0aBcc@example.com"]);
  assert.equal(links[1].href, "mailto:student%250aBcc%40example.com");
  assert.equal(links[1].external, false);
  assert.equal(portfolioProfileLinks({ links: { email: "student@example.com?bcc=other@example.com" } }).length, 0);
});

test("metadata text normalizes whitespace and truncates complete Unicode code points", () => {
  assert.equal(concisePortfolioText("  Student\n developer  ", 40), "Student developer");
  assert.equal(concisePortfolioText("ab🙂cd", 4), "ab🙂…");
  assert.ok(concisePortfolioText("ab🙂cd", 4).isWellFormed());
});
