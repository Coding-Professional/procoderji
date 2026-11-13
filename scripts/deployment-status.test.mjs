import assert from "node:assert/strict";
import test from "node:test";
import { activateDeployment, findDeployment, waitForDeployment } from "./deployment-status.mjs";

const id = "dpl_test123";
const options = { label: "Backend", intervalMs: 0, maxAttempts: 3 };

test("already-current production builds do not request a conflicting promotion", async () => {
  await activateDeployment(id, { ...options, project: "project", read: async () => ({ id: "project", targets: { production: { id } } }),
    promote: async () => assert.fail("already-current deployments must not be promoted again") });
});

test("promotion waits until the checked deployment becomes the project's current target", async () => {
  let promoted = false;
  let reads = 0;
  await activateDeployment(id, { ...options, project: "project",
    read: async () => ({ id: "project", targets: { production: { id: ++reads < 3 ? "dpl_old" : id } } }),
    promote: async () => { promoted = true; } });
  assert.equal(promoted, true);
  assert.equal(reads, 3);
});

test("wrong projects, failed promotions and stale canonical targets cannot pass", async () => {
  await assert.rejects(activateDeployment(id, { ...options, project: "project", read: async () => ({ id: "other" }),
    promote: async () => assert.fail("wrong project must not be promoted") }), /different project/);
  const input = { ...options, project: "project", read: async () => ({ id: "project" }) };
  await assert.rejects(activateDeployment(id, { ...input, promote: async () => { throw Error("Promotion denied"); } }), /Promotion denied/);
  await assert.rejects(activateDeployment(id, { ...input, promote: async () => {} }), /canonical target/);
});

test("deployment discovery ignores old runs and waits for the exact invocation to be indexed", async () => {
  let reads = 0;
  const older = { uid: "dpl_old", meta: { sourceCommit: "commit", sourceRun: "older" } };
  const current = { uid: id, meta: { sourceCommit: "commit", sourceRun: "current" } };
  const found = await findDeployment({ ...options, commit: "commit", run: "current", read: async () => ++reads === 1 ? [older] : [older, current] });
  assert.equal(found, id);
  assert.equal(reads, 2);
});

test("discovery rejects wrong commits, ambiguous records and malformed provider lists", async () => {
  const record = { id, meta: { sourceCommit: "commit", sourceRun: "current" } };
  const input = { ...options, commit: "commit", run: "current" };
  await assert.rejects(findDeployment({ ...input, read: async () => [{ ...record, meta: { sourceCommit: "different", sourceRun: "current" } }] }), /not found/);
  await assert.rejects(findDeployment({ ...input, read: async () => [record, record] }), /ambiguous/);
  await assert.rejects(findDeployment({ ...input, read: async () => undefined }), /list is invalid/);
  await assert.rejects(findDeployment({ ...input, run: "", read: async () => assert.fail("unexpected lookup") }), /metadata is missing/);
});

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
