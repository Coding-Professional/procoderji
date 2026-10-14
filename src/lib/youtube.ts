// Latest uploads from a YouTube channel via its public Atom feed
// (https://www.youtube.com/feeds/videos.xml?channel_id=...). No API key, no
// quota and no cost. The feed returns the most recent ~15 uploads.
//
// Everything here fails soft: any network, status, content-type or parsing
// problem yields an empty list and never throws, so the page can always render.

export interface YouTubeVideo {
	id: string;
	title: string;
	/** ISO timestamp from the feed. */
	publishedAt: string;
	/** Always built from the validated id, never taken from the feed. */
	url: string;
	thumbnail: string;
}

const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const MAX_FEED_BYTES = 1_000_000;

export function parseChannelId(value: string | undefined | null): string | null {
	const v = value?.trim();
	return v && CHANNEL_ID_RE.test(v) ? v : null;
}

/** Channel to show, from the server-side YOUTUBE_CHANNEL_ID setting. Null while unset or invalid. */
export function getYoutubeChannelId(): string | null {
	return parseChannelId(process.env.YOUTUBE_CHANNEL_ID);
}

export const channelUrl = (channelId: string) => `https://www.youtube.com/channel/${channelId}`;
export const feedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(s: string): string {
	return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
		if (e[0] === "#") {
			const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
			return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
		}
		return ENTITIES[e.toLowerCase()] ?? m;
	});
}

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];

/** Parse the channel Atom feed into videos, skipping any entry that is not fully valid. */
export function parseFeed(xml: string, limit = 6): YouTubeVideo[] {
	const out: YouTubeVideo[] = [];
	for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
		const block = m[1];
		const id = tag(block, "yt:videoId")?.trim();
		const title = tag(block, "title");
		const published = tag(block, "published")?.trim();
		if (!id || !VIDEO_ID_RE.test(id) || !title || !published || Number.isNaN(Date.parse(published))) continue;
		out.push({
			id,
			title: decodeEntities(title).trim(),
			publishedAt: published,
			url: `https://www.youtube.com/watch?v=${id}`,
			thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
		});
		if (out.length >= limit) break;
	}
	return out;
}

export interface FetchOptions {
	fetchImpl?: typeof fetch;
	limit?: number;
	timeoutMs?: number;
	/** Seconds Next.js may serve a cached copy before refetching. */
	revalidate?: number;
}

/** Latest uploads, or [] on any failure. Never throws. */
export async function fetchLatestVideos(
	channelId: string | null | undefined,
	{ fetchImpl = fetch, limit = 6, timeoutMs = 5000, revalidate = 3600 }: FetchOptions = {}
): Promise<YouTubeVideo[]> {
	const id = parseChannelId(channelId);
	if (!id) return [];
	try {
		const res = await fetchImpl(feedUrl(id), {
			signal: AbortSignal.timeout(timeoutMs),
			next: { revalidate },
		} as RequestInit);
		if (!res.ok) return [];
		if (!/xml/i.test(res.headers.get("content-type") ?? "")) return [];
		const xml = await res.text();
		if (xml.length > MAX_FEED_BYTES) return [];
		return parseFeed(xml, limit);
	} catch {
		return [];
	}
}
