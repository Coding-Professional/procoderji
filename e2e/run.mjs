// Browser tests: builds the site with temporary synthetic content, drives Chrome over every
// page on desktop and mobile, then restores the real data. Usage: npm run e2e
// Needs Google Chrome installed (set E2E_CHANNEL=msedge to use Edge instead).
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const fixtures = require("./fixtures.cjs");
const ROOT = path.resolve(import.meta.dirname, "..");
const PORT = process.env.E2E_PORT || "3150";
const NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

let server = null;
let restored = false;
const cleanup = () => {
	if (restored) return;
	restored = true;
	if (server?.pid) spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
	if (server?.pid && process.platform !== "win32") try { process.kill(server.pid); } catch {}
	fixtures.restore();
};
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { cleanup(); process.exit(130); });

let code = 1;
try {
	fixtures.apply(); // throws (and changes nothing) if real content has uncommitted changes
	const build = spawnSync(process.execPath, [NEXT, "build"], { cwd: ROOT, stdio: "inherit" });
	if (build.status !== 0) throw new Error("next build failed");

	server = spawn(process.execPath, [NEXT, "start", "-p", PORT], { cwd: ROOT, stdio: "ignore" });
	const base = `http://localhost:${PORT}`;
	for (let i = 0; i < 40; i++) {
		try { if ((await fetch(base)).ok) break; } catch {}
		await new Promise((r) => setTimeout(r, 500));
	}

	const checks = spawnSync(process.execPath, [path.join(ROOT, "e2e", "checks.mjs")], {
		cwd: ROOT, stdio: "inherit", env: { ...process.env, BASE: base },
	});
	code = checks.status ?? 1;
} catch (e) {
	console.error(String(e.message ?? e));
} finally {
	cleanup();
}
process.exit(code);
