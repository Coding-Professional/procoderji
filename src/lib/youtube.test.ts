import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChannelId, parseFeed, fetchLatestVideos, feedUrl } from "./youtube.ts";

const CHANNEL = "UC" + "a".repeat(22);

// Synthetic fixture modelled on the structure of a real feed (checked against
// https://www.youtube.com/feeds/videos.xml on 2026-10-14). Not real channel data.
const entry = (id: string, title: string, published: string) => `
 <entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/>
  <published>${published}</published>
  <media:group><media:title>${title}</media:title>
   <media:thumbnail url="https://i2.ytimg.com/vi/${id}/hqdefault.jpg" width="480" height="360"/>
  </media:group>
 </entry>`;

const feed = (...entries: string[]) =>
	`<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">\n <title>Channel</title>${entries.join("")}\n</feed>`;

const xmlResponse = (body: string, init: ResponseInit = {}) =>
	new Response(body, { status: 200, headers: { "content-type": "text/xml; charset=UTF-8" }, ...init });

test("parseChannelId accepts only real-looking channel ids", () => {
	assert.equal(parseChannelId(CHANNEL), CHANNEL);
	assert.equal(parseChannelId(`  ${CHANNEL}  `), CHANNEL);
	for (const bad of [undefined, null, "", "UC123", "ucaaaaaaaaaaaaaaaaaaaaaaaa", CHANNEL + "x", "UC" + "a".repeat(21) + "/", "https://youtube.com/@x"]) {
		assert.equal(parseChannelId(bad as string | undefined), null, String(bad));
	}
});

test("parseFeed returns videos newest-first as given, with urls built from the id", () => {
	const videos = parseFeed(feed(entry("AAAAAAAAAAA", "First", "2026-10-13T21:00:25+00:00"), entry("BBBBBBBBBBB", "Second", "2026-10-01T10:00:00+00:00")));
	assert.deepEqual(videos, [
		{
			id: "AAAAAAAAAAA",
			title: "First",
			publishedAt: "2026-10-13T21:00:25+00:00",
			url: "https://www.youtube.com/watch?v=AAAAAAAAAAA",
			thumbnail: "https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg",
		},
		{
			id: "BBBBBBBBBBB",
			title: "Second",
			publishedAt: "2026-10-01T10:00:00+00:00",
			url: "https://www.youtube.com/watch?v=BBBBBBBBBBB",
			thumbnail: "https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg",
		},
	]);
});

test("parseFeed respects the limit", () => {
	const many = Array.from({ length: 10 }, (_, i) => entry(`V${String(i).padStart(10, "0")}`, `T${i}`, "2026-10-01T00:00:00+00:00"));
	assert.equal(parseFeed(feed(...many), 3).length, 3);
	assert.equal(parseFeed(feed(...many)).length, 6);
});

test("parseFeed decodes entities in titles", () => {
	const [v] = parseFeed(feed(entry("AAAAAAAAAAA", "Tom &amp; Jerry &quot;live&quot; &#39;x&#39; &lt;3 &#x41;", "2026-10-01T00:00:00+00:00")));
	assert.equal(v.title, `Tom & Jerry "live" 'x' <3 A`);
});

test("parseFeed skips invalid entries instead of failing", () => {
	const videos = parseFeed(
		feed(
			entry("short", "bad id", "2026-10-01T00:00:00+00:00"),
			entry("AAAAAAAAAAA", "bad date", "not-a-date"),
			entry("bad/id/chars", "bad chars", "2026-10-01T00:00:00+00:00"),
			entry("CCCCCCCCCCC", "good", "2026-10-01T00:00:00+00:00")
		)
	);
	assert.deepEqual(videos.map((v) => v.id), ["CCCCCCCCCCC"]);
});

test("parseFeed never trusts urls from the feed", () => {
	const evil = `<entry><yt:videoId>AAAAAAAAAAA</yt:videoId><title>t</title><published>2026-10-01T00:00:00+00:00</published>
		<link rel="alternate" href="javascript:alert(1)"/><media:thumbnail url="https://evil.example/x.jpg"/></entry>`;
	const [v] = parseFeed(feed(evil));
	assert.ok(v.url.startsWith("https://www.youtube.com/watch?v="));
	assert.ok(v.thumbnail.startsWith("https://i.ytimg.com/vi/"));
});

test("garbage input yields an empty list", () => {
	assert.deepEqual(parseFeed(""), []);
	assert.deepEqual(parseFeed("<html>not a feed</html>"), []);
});

test("fetchLatestVideos fetches the channel feed and parses it", async () => {
	let requested = "";
	const fetchImpl = (async (url: string) => {
		requested = url;
		return xmlResponse(feed(entry("AAAAAAAAAAA", "Hello", "2026-10-13T00:00:00+00:00")));
	}) as unknown as typeof fetch;
	const videos = await fetchLatestVideos(CHANNEL, { fetchImpl });
	assert.equal(requested, feedUrl(CHANNEL));
	assert.equal(videos.length, 1);
});

test("fetchLatestVideos fails soft on errors, bad status, wrong type and oversized bodies", async () => {
	const mk = (impl: () => Promise<Response>) => ({ fetchImpl: impl as unknown as typeof fetch });
	assert.deepEqual(await fetchLatestVideos(CHANNEL, mk(async () => { throw new Error("network down"); })), []);
	assert.deepEqual(await fetchLatestVideos(CHANNEL, mk(async () => xmlResponse("x", { status: 500 }))), []);
	assert.deepEqual(await fetchLatestVideos(CHANNEL, mk(async () => xmlResponse("x", { status: 404 }))), []);
	assert.deepEqual(
		await fetchLatestVideos(CHANNEL, mk(async () => new Response(feed(entry("AAAAAAAAAAA", "t", "2026-10-01T00:00:00+00:00")), { headers: { "content-type": "text/html" } }))),
		[]
	);
	assert.deepEqual(await fetchLatestVideos(CHANNEL, mk(async () => xmlResponse("a".repeat(1_000_001)))), []);
	assert.deepEqual(await fetchLatestVideos(CHANNEL, mk(async () => xmlResponse("<feed>broken"))), []);
});

test("fetchLatestVideos does not call the network for a missing or invalid channel id", async () => {
	let calls = 0;
	const fetchImpl = (async () => { calls++; return xmlResponse(""); }) as unknown as typeof fetch;
	assert.deepEqual(await fetchLatestVideos(undefined, { fetchImpl }), []);
	assert.deepEqual(await fetchLatestVideos("not-a-channel", { fetchImpl }), []);
	assert.equal(calls, 0);
});

test("fetchLatestVideos gives up after the timeout", async () => {
	const fetchImpl = ((_url: string, init?: RequestInit) =>
		new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))))) as unknown as typeof fetch;
	const started = Date.now();
	assert.deepEqual(await fetchLatestVideos(CHANNEL, { fetchImpl, timeoutMs: 50 }), []);
	assert.ok(Date.now() - started < 2000);
});

test("only the first three videos are shown on phones, and the rest use display:none", async () => {
	const { MOBILE_VIDEO_COUNT, videoItemClass } = await import("./youtube.ts");
	assert.equal(MOBILE_VIDEO_COUNT, 3);
	assert.deepEqual([0, 1, 2, 3, 4, 5].map(videoItemClass), ["", "", "", "hidden sm:block", "hidden sm:block", "hidden sm:block"]);
});

test("the mobile limit hides cards with display:none (out of the accessibility tree), not just visually", async () => {
	const { videoItemClass } = await import("./youtube.ts");
	const hidden = videoItemClass(5).split(" ");
	assert.ok(hidden.includes("hidden"), "must use Tailwind's `hidden` (display:none)");
	assert.ok(hidden.includes("sm:block"), "must show again from the sm breakpoint so desktop keeps all videos");
	assert.ok(!/opacity|sr-only|invisible|h-0|overflow-hidden/.test(videoItemClass(5)), "must not rely on visual-only hiding");
});
