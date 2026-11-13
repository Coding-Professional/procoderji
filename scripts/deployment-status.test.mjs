import assert from "node:assert/strict";
import test from "node:test";
import { waitForDeployment } from "./deployment-status.mjs";

const id = "dpl_test123";
const options = { label: "Backend", intervalMs: 0, maxAttempts: 3 };

test("queued and building deployments are checked until the provider reports ready", async () => {
  const states = ["QUEUED", "BUILDING", "READY"];
  const seen = [];
  const result = await waitForDeployment(id, { ...options, read: async requested => {
    seen.push(requested);
    return { id, readyState: states.shift() };
  } });
  assert.equal(result.readyState, "READY");
  assert.deepEqual(seen, [id, id, id]);
});

test("failed or canceled builds cannot pass the readiness gate", async () => {
  for (const readyState of ["ERROR", "CANCELED", "CANCELLED"]) {
    await assert.rejects(waitForDeployment(id, { ...options, read: async () => ({ id, readyState }) }), /deployment failed/);
  }
});

test("a deployment that stays queued fails after bounded polling", async () => {
  let reads = 0;
  await assert.rejects(waitForDeployment(id, { ...options, read: async () => {
    reads++;
    return { id, readyState: "QUEUED" };
  } }), /timeout/);
  assert.equal(reads, options.maxAttempts);
});

test("missing IDs, mismatched records and unavailable status lookups fail closed", async () => {
  await assert.rejects(waitForDeployment(undefined, { ...options, read: async () => assert.fail("unexpected lookup") }), /ID is missing/);
  await assert.rejects(waitForDeployment(id, { ...options, read: async () => ({ id: "dpl_other", readyState: "READY" }) }), /different deployment/);
  await assert.rejects(waitForDeployment(id, { ...options, read: async () => { throw new Error("Status unavailable"); } }), /Status unavailable/);
});
