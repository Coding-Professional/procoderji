/** Confirm provider state instead of trusting the CLI's deployment snapshot. */
export async function readProviderResult(response, label, { empty = false } = {}) {
  if (!response.ok) throw new Error(`${label} provider request failed (${response.status}).`);
  // Promotion returns a successful empty 200 response, not a JSON document.
  if (empty || response.status === 204) return {};
  try { return await response.json(); }
  catch { throw new Error(`${label} provider returned invalid JSON.`); }
}

export async function activateDeployment(id, {
  project, label, read, promote, maxAttempts = 30, intervalMs = 2000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
}) {
  const current = async () => {
    const record = await read();
    if (record.id !== project) throw new Error(`${label} target belongs to a different project.`);
    return record.targets?.production?.id === id;
  };
  // Some deployment runtimes assign production domains despite --skip-domain.
  // Promoting an already-current deployment returns 409; verify and finish instead.
  if (await current()) return;
  await promote();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await current()) return;
    if (attempt + 1 < maxAttempts) await sleep(intervalMs);
  }
  throw new Error(`${label} canonical target does not serve the checked deployment.`);
}

export async function findDeployment({
  read, commit, run, label, maxAttempts = 10, intervalMs = 1000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
}) {
  if (!commit || !run) throw new Error(`${label} deployment metadata is missing.`);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const records = await read();
    if (!Array.isArray(records)) throw new Error(`${label} deployment list is invalid.`);
    const matches = records.filter(item => item.meta?.sourceCommit === commit && item.meta?.sourceRun === run);
    if (matches.length > 1) throw new Error(`${label} deployment metadata is ambiguous.`);
    if (matches.length === 1) return matches[0].uid ?? matches[0].id;
    if (attempt + 1 < maxAttempts) await sleep(intervalMs);
  }
  throw new Error(`${label} deployment was not found for this run.`);
}

export async function waitForDeployment(id, {
  read,
  label,
  maxAttempts = 60,
  intervalMs = 5000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
}) {
  if (!/^dpl_[a-zA-Z0-9]+$/.test(id ?? "")) throw new Error(`${label} deployment ID is missing or invalid.`);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const deployment = await read(id);
    if (deployment.id !== id) throw new Error(`${label} status returned a different deployment.`);
    if (deployment.readyState === "READY") return deployment;
    if (["ERROR", "CANCELED", "CANCELLED"].includes(deployment.readyState)) {
      throw new Error(`${label} deployment failed (${deployment.readyState}).`);
    }
    if (attempt + 1 < maxAttempts) await sleep(intervalMs);
  }
  throw new Error(`${label} deployment did not become ready before the timeout.`);
}
