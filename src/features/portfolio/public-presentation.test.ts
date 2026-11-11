import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTACT_EMAIL } from "../../lib/contact.ts";
import { getSiteUrl } from "../../lib/site.ts";
import { portfolioReportHref, publicPortfolioMetadata, publicPortfolioPath } from "./public-presentation.ts";

const portfolio = { username: "riya-student", data: { name: "Riya Sharma", headline: "Computer science student", about: "Building useful tools." }, searchVisible: false };

test("published portfolios stay out of search until their published visibility opts in", () => {
  const hidden = publicPortfolioMetadata(portfolio);
  assert.deepEqual(hidden.robots, { index: false, follow: true });
  assert.equal(hidden.alternates, undefined);
  const indexable = publicPortfolioMetadata({ ...portfolio, searchVisible: true });
  assert.deepEqual(indexable.robots, { index: true, follow: true });
  assert.deepEqual(indexable.alternates, { canonical: "/u/riya-student" });
  assert.ok(indexable.openGraph);
  assert.ok(indexable.twitter);
});

test("public paths and report links reject invalid or reserved usernames", () => {
  assert.equal(publicPortfolioPath("riya-student"), "/u/riya-student");
  for (const username of ["admin", "../account", "abc/extra", "RIYA", "student\nbcc:other@example.com"])
    assert.throws(() => portfolioReportHref(username), /Invalid portfolio username/);
});

test("report mail points to the site contact and includes only the canonical public address", () => {
  const href = portfolioReportHref("riya-student");
  assert.ok(href.startsWith(`mailto:${CONTACT_EMAIL}?`));
  const query = new URLSearchParams(href.split("?")[1]);
  assert.equal(query.get("subject"), "Report portfolio: riya-student");
  assert.ok(query.get("body")?.includes(`${getSiteUrl()}/u/riya-student`));
  assert.equal(query.get("bcc"), null);
  assert.equal(query.get("cc"), null);
});
