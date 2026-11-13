import assert from "node:assert/strict";
import test from "node:test";
import { branchPolicy } from "./check-branch-policy.mjs";

const repository = "procoderji-com/procoderji";
const check = (base, head, sourceRepository = repository) => branchPolicy({ base, head, sourceRepository, repository });

test("contributors and bots can send changes to dev", () => {
  assert.equal(check("dev", "feat/student-experience", "contributor/procoderji"), null);
  assert.equal(check("dev", "dependabot/npm_and_yarn/example"), null);
});

test("main accepts only the canonical dev branch", () => {
  assert.equal(check("main", "dev"), null);
  assert.ok(check("main", "feat/student-experience"));
  assert.ok(check("main", "dependabot/npm_and_yarn/example"));
  assert.ok(check("main", "dev", "contributor/procoderji"));
});

test("unknown or absent targets do not silently pass", () => {
  assert.ok(check("release/1.0", "dev"));
  assert.ok(check(undefined, undefined));
  assert.ok(branchPolicy({ base: "main", head: "dev" }));
});
