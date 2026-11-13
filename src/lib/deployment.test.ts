import assert from "node:assert/strict";
import test from "node:test";
import { isNonProductionDeployment } from "./deployment.ts";

test("staging and previews remain non-indexable even when using production builds", () => {
  assert.equal(isNonProductionDeployment("staging", "production"), true);
  assert.equal(isNonProductionDeployment(undefined, "preview"), true);
  assert.equal(isNonProductionDeployment("production", "production"), false);
  assert.equal(isNonProductionDeployment(undefined, undefined), false);
});
