/** Confirm provider state instead of trusting the CLI's deployment snapshot. */
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
