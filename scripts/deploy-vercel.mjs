// Deployment credentials stay in environment secrets, never in source or logs.
// PR jobs never execute this script with deployment credentials.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { findDeployment, waitForDeployment } from "./deployment-status.mjs";

const root = path.resolve(import.meta.dirname, "..");
const localStaging = process.argv.includes("--local-staging");
const branch = localStaging ? "dev" : process.env.GITHUB_REF_NAME;
const temporary = [];
const env = { ...process.env, DEBUG: "" };
const cli = process.env.VERCEL_CLI;
const command = cli?.endsWith(".js") ? process.execPath : cli || "vercel";
const prefix = cli?.endsWith(".js") ? [cli] : [];

function requireValue(key) {
  const value = process.env[key];
  if (!value?.trim()) throw new Error(`Missing deployment setting: ${key}`);
  return value;
}

function origin(key) {
  const value = requireValue(key);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error(`Expected an HTTPS origin for ${key}`);
  }
  return url.origin;
}

function workspace() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "procoderji-deploy-"));
  temporary.push(directory);
  return directory;
}

function vercel(args, cwd, project, token, json = true) {
  const result = spawnSync(command, [
    ...prefix, ...args,
    ...(token ? ["--token", token] : []),
  ], {
    cwd, env: { ...env, VERCEL_ORG_ID: requireValue("VERCEL_ORG_ID"), VERCEL_PROJECT_ID: project },
    encoding: "utf8", windowsHide: true, timeout: 12 * 60 * 1000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error("Vercel command failed. Inspect the deployment in the project dashboard.");
  if (!json) return;
  let data;
  try { data = JSON.parse(result.stdout); } catch { /* Never dump raw provider logs. */ }
  if (result.status !== 0 || !data) throw new Error("Vercel deployment failed. Inspect its build in the project dashboard.");
  return data;
}

function authentication(tokenKey) {
  if (localStaging && !process.env[tokenKey]) return undefined;
  // Native CLI 65 requires its explicit token option; no shell or command logging is used.
  return requireValue(tokenKey);
}

async function providerApi(endpoint, cwd, project, token, label) {
  const url = new URL(endpoint, "https://api.vercel.com");
  url.searchParams.set("teamId", requireValue("VERCEL_ORG_ID"));
  if (!token) return vercel(["api", `${url.pathname}${url.search}`, "--method", "GET"], cwd, project);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${label} provider lookup failed (${response.status}).`);
  return response.json();
}

async function confirmReady(cwd, project, token, label, commit, run) {
  // CLI JSON envelopes differ across platforms. Resolve this exact invocation
  // from provider metadata, then verify its project and live readiness state.
  const id = await findDeployment({
    label, commit, run,
    read: async () => (await providerApi(`/v6/deployments?projectId=${project}&limit=20`, cwd, project, token, label)).deployments,
  });
  return waitForDeployment(id, {
    label,
    read: async id => {
      const deployment = await providerApi(`/v13/deployments/${id}`, cwd, project, token, label);
      if (deployment.projectId !== project) throw new Error(`${label} deployment belongs to a different project.`);
      return { id: deployment.id, readyState: deployment.readyState };
    },
  });
}

async function promote(deployment, cwd, project, token, label) {
  // A previous rollback can leave domains pinned to an older build. Activate only
  // this invocation's verified production build, then confirm the canonical target.
  vercel(["promote", deployment.id, "--yes"], cwd, project, token, false);
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await providerApi(`/v9/projects/${project}`, cwd, project, token, label);
    if (current.id !== project) throw new Error(`${label} target belongs to a different project.`);
    if (current.targets?.production?.id === deployment.id) return;
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`${label} canonical target does not serve the checked deployment.`);
}

function deploySource() {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error("Cannot enumerate tracked deployment source.");
  const directory = workspace();
  for (const file of result.stdout.split("\0").filter(Boolean)) {
    const source = path.resolve(root, file);
    if (!source.startsWith(root + path.sep) || fs.lstatSync(source).isSymbolicLink()) {
      throw new Error("Deployment source must contain ordinary repository files.");
    }
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
  return directory;
}

async function check(url, inspect) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
      if (await inspect(response)) return;
    } catch { /* Cold starts can need one retry. */ }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error("A deployed endpoint failed its release check.");
}

async function main() {
  if (localStaging && process.env.GITHUB_ACTIONS === "true") throw new Error("Local staging mode is unavailable in Actions.");
  if (!["dev", "main"].includes(branch)) throw new Error("Only dev and main have deployment environments.");
  if (!localStaging && (process.env.GITHUB_EVENT_NAME !== "push" || process.env.GITHUB_REPOSITORY !== "procoderji-com/procoderji")) {
    throw new Error("Only checked pushes to the canonical repository can deploy.");
  }
  const publicOrigin = origin("PUBLIC_ORIGIN");
  const backendOrigin = origin("BACKEND_ORIGIN");
  if (branch === "main" && publicOrigin !== "https://procoderji.com") throw new Error("Unexpected production origin.");
  if (branch === "dev" && publicOrigin === "https://procoderji.com") throw new Error("Staging must have its own origin.");
  const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).stdout.trim();
  if (!/^[a-f0-9]{40}$/.test(sha) || (!localStaging && sha !== process.env.GITHUB_SHA)) throw new Error("The checkout must match the checked commit.");
  const backendProject = requireValue("VERCEL_BACKEND_PROJECT_ID");
  const frontendProject = requireValue("VERCEL_FRONTEND_PROJECT_ID");
  if (backendProject === frontendProject) throw new Error("Backend and frontend projects must be separate.");

  const backendSource = deploySource();
  const frontendSource = deploySource();
  fs.copyFileSync(path.join(backendSource, "vercel.backend.json"), path.join(backendSource, "vercel.json"));
  const run = randomUUID();
  const deployArgs = ["deploy", "--prod", "--skip-domain", "--yes", "--json", "--meta", `sourceCommit=${sha}`, "--meta", `sourceBranch=${branch}`, "--meta", `sourceRun=${run}`];
  const backendToken = authentication("VERCEL_BACKEND_TOKEN");
  vercel([...deployArgs, "--project", backendProject], backendSource, backendProject, backendToken);
  const backend = await confirmReady(backendSource, backendProject, backendToken, "Backend", sha, run);
  await promote(backend, backendSource, backendProject, backendToken, "Backend");
  await check(`${backendOrigin}/api/platform/health`, async r => r.ok && (await r.json()).status === "ok");
  await check(`${backendOrigin}/api/platform/auth/session`, async r => {
    if (!r.ok) return false;
    const session = await r.json();
    return !!session.csrfToken && (branch !== "main" || session.configured === true);
  });
  console.log("Backend is ready; database-backed session check passed.");

  const frontendToken = authentication("VERCEL_FRONTEND_TOKEN");
  vercel([...deployArgs, "--project", frontendProject], frontendSource, frontendProject, frontendToken);
  const frontend = await confirmReady(frontendSource, frontendProject, frontendToken, "Frontend", sha, run);
  await promote(frontend, frontendSource, frontendProject, frontendToken, "Frontend");
  await check(publicOrigin, async r => r.ok && (branch === "main" || r.headers.get("x-robots-tag")?.includes("noindex")));
  console.log(`Frontend is ready: ${publicOrigin}`);
  const summary = `### ${branch === "main" ? "Production" : "Staging"} deployment\n\nCommit: \`${sha}\`\n\n- Frontend: ${publicOrigin}\n- Backend: ${backendOrigin}\n- Health and database-backed session checks passed.\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Deployment failed.");
  process.exitCode = 1;
} finally {
  const parent = fs.realpathSync(os.tmpdir());
  for (const directory of temporary) {
    const resolved = path.resolve(directory);
    if (path.dirname(resolved) === parent && path.basename(resolved).startsWith("procoderji-deploy-")) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}
