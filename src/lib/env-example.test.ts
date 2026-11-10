import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseChannelId } from "./youtube.ts";
import { DEFAULT_SITE_URL, parseSiteUrl } from "./site.ts";

/** Minimal .env parser: KEY=VALUE lines, ignoring blanks and # comments. */
function parseEnv(text: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const line of text.split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (m) out[m[1]] = m[2];
	}
	return out;
}

const example = parseEnv(fs.readFileSync(".env.example", "utf8"));

test(".env.example sets a valid YouTube channel id for @Pro_coder_ji", () => {
	assert.equal(parseChannelId(example.YOUTUBE_CHANNEL_ID), "UC74q2pzSGuoaikYwnavcGMg");
});

test(".env.example does not override the canonical domain by default", () => {
	// The override is documented but commented out, so copying the file cannot change the domain.
	assert.equal(example.NEXT_PUBLIC_SITE_URL, undefined);
	assert.match(fs.readFileSync(".env.example", "utf8"), /^# NEXT_PUBLIC_SITE_URL=https:\/\/procoderji\.com$/m);
	assert.equal(parseSiteUrl(DEFAULT_SITE_URL), "https://procoderji.com");
});

test(".env.example contains only public, non-secret settings", () => {
	assert.deepEqual(Object.keys(example).sort(), ["YOUTUBE_CHANNEL_ID"]);
	assert.ok(!/secret|password|api[_-]?key|token/i.test(Object.keys(example).join(" ")));
});

test("the deployment guide matches the public channel and canonical site configuration", () => {
	const doc = fs.readFileSync("docs/deployment.md", "utf8");
	assert.ok(doc.includes(example.YOUTUBE_CHANNEL_ID));
	assert.ok(doc.includes(DEFAULT_SITE_URL));
});
