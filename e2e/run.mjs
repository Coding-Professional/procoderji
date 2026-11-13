// Browser checks use temporary synthetic content and restore it when they exit.
// E2E_DOTNET=1 starts an isolated test-only host for the real ASP.NET Core API.
// Fixture authentication exists in the test executable only. The production API
// never exposes fixture account, moderation or publication controls.
// Needs Chrome installed (set E2E_CHANNEL=msedge to use Edge instead).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import * as fixtures from "./fixtures.mjs";
const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = checkedPort(process.env.E2E_PORT || "3150", "E2E_PORT");
const BASE = `http://localhost:${PORT}`;
const FULLSTACK = process.env.E2E_DOTNET === "1";
const BACKEND_PORT = checkedPort(process.env.E2E_BACKEND_PORT || "5151", "E2E_BACKEND_PORT");
const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`;
const BACKEND_PROJECT = path.join(ROOT, "backend", "tests", "ProCoderJi.BrowserHost", "ProCoderJi.BrowserHost.csproj");
const BACKEND_DLL = path.join(ROOT, "backend", "tests", "ProCoderJi.BrowserHost", "bin", "Release", "net10.0", "ProCoderJi.BrowserHost.dll");
const NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const TEMP_ROOT = fs.realpathSync(os.tmpdir());
const runEnv = { ...process.env, DOTNET_API_URL: FULLSTACK ? BACKEND_ORIGIN : "",
  CONTACT_PROXY_KEY: FULLSTACK ? "browser-fixture-contact-proxy-key-123456789" : "", VERCEL: "" };

let server = null;
let backend = null;
let activeCommand = null;
let tempDirectory = null;
let fixturesApplied = false;
let cleaned = false;

function checkedPort(value, name) {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) throw new Error(`${name} must be a port from 1 to 65535`);
  return value;
}

function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  } else {
    try { process.kill(-child.pid, "SIGKILL"); }
    catch { try { child.kill("SIGKILL"); } catch {} }
  }
}

function start(executable, args, env) {
  const child = spawn(executable, args, {
    cwd: ROOT, env, detached: process.platform !== "win32", windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const capture = (chunk) => { output = (output + chunk.toString()).slice(-6000); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  child.on("error", (error) => capture(error.message));
  return { child, logs: () => output };
}

function run(executable, args, env = runEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: ROOT, env, detached: process.platform !== "win32", windowsHide: true, stdio: "inherit",
    });
    activeCommand = child;
    child.once("error", (error) => { if (activeCommand === child) activeCommand = null; reject(error); });
    child.once("exit", (status, signal) => {
      if (activeCommand === child) activeCommand = null;
      if (status === 0) resolve();
      else reject(new Error(`${path.basename(executable)} ${args[0]} failed (${signal ?? status ?? "unknown exit"})`));
    });
  });
}

async function waitUntilReady(service, url, name, attempts = 60) {
  for (let index = 0; index < attempts; index++) {
    if (service.child.exitCode !== null || !service.child.pid) break;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready at ${url}.\n${service.logs()}`);
}

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  stop(activeCommand);
  stop(server?.child);
  stop(backend?.child);
  try {
    if (fixturesApplied) fixtures.restore();
  } finally {
    if (tempDirectory) {
      // Delete only the uniquely generated directory owned by this invocation.
      const target = path.resolve(tempDirectory);
      if (path.dirname(target) !== TEMP_ROOT || !path.basename(target).startsWith("procoderji-e2e-")) {
        throw new Error("Refusing to remove an unexpected E2E temporary directory");
      }
      fs.rmSync(target, { recursive: true, force: true });
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  try { cleanup(); } finally { process.exit(130); }
});

let code = 1;
try {
  // If the cleanliness check fails, cleanup must never check out real content.
  fixtures.assertClean();
  fixturesApplied = true;
  fixtures.apply();

  if (FULLSTACK) {
    if (PORT === BACKEND_PORT) throw new Error("E2E_PORT and E2E_BACKEND_PORT must differ");
    await run("dotnet", ["restore", BACKEND_PROJECT, "--locked-mode"]);
    await run("dotnet", ["build", BACKEND_PROJECT, "--configuration", "Release", "--no-restore"]);
    tempDirectory = fs.mkdtempSync(path.join(TEMP_ROOT, "procoderji-e2e-"));
    const backendEnv = {
      ...runEnv,
      ASPNETCORE_ENVIRONMENT: "Testing",
      DOTNET_ENVIRONMENT: "Testing",
      PublicOrigin: BASE,
      Database__Provider: "Sqlite",
      Database__MigrateOnStartup: "true",
      Logging__LogLevel__Default: "Warning",
    };
    // Never inherit an operator's external test connection into browser fixtures.
    for (const name of ["PROCODERJI_TEST_POSTGRES", "PROCODERJI_TEST_SQLSERVER", "PROCODERJI_TEST_MONGODB", "ConnectionStrings__Platform", "Database__Name"])
      delete backendEnv[name];
    backend = start("dotnet", [BACKEND_DLL, "--port", BACKEND_PORT, "--data-directory", tempDirectory], backendEnv);
    await waitUntilReady(backend, `${BACKEND_ORIGIN}/api/platform/health`, "ASP.NET Core API");
    console.log(`Isolated test-only ASP.NET Core browser host ready at ${BACKEND_ORIGIN}.`);
  }

  await run(process.execPath, [NEXT, "build"]);
  server = start(process.execPath, [NEXT, "start", "-p", PORT], runEnv);
  await waitUntilReady(server, BASE, "Next.js", 40);
  const checks = process.env.E2E_CONTACT_ONLY === "1" ? "contact-checks.mjs" : "checks.mjs";
  await run(process.execPath, [path.join(ROOT, "e2e", checks)], { ...runEnv, BASE, E2E_BACKEND_ORIGIN: BACKEND_ORIGIN });
  code = 0;
} catch (error) {
  console.error(String(error.message ?? error));
} finally {
  try { cleanup(); }
  catch (error) { console.error(`E2E cleanup failed: ${String(error.message ?? error)}`); code = 1; }
}
process.exit(code);
