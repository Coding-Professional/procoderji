import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { parseBackendOrigin } from "../account/config";
import { validateUsername } from "./validation";
import { parsePublicState, portfolioCacheTag, type PublishedPortfolio } from "./public-model";
import { loadPublishedSnapshot, PublicationChangedError } from "./public-loader";

async function readPublic(origin: string, path: string): Promise<unknown | null> {
  const response = await fetch(`${origin}/api/platform/portfolio/public${path}`, {
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Public portfolios are temporarily unavailable.");
  const payload: unknown = await response.json();
  if (payload === null) throw new Error("The portfolio service returned an invalid public response.");
  return payload;
}

/** Only immutable published data is cached. Visibility is checked afresh on every page request. */
export const getPublishedPortfolio = cache(async (username: string): Promise<PublishedPortfolio | null> => {
  if (validateUsername(username).length) return null;
  const origin = parseBackendOrigin(process.env.DOTNET_API_URL);
  if (!origin) return null;
  // A new publication can race the first state read; retry against its new version once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const rawState = await readPublic(origin, `/${username}/state`);
    if (rawState === null) return null;
    const state = parsePublicState(rawState, username);
    if (!state) throw new Error("The portfolio service returned an invalid public state.");
    try {
      return await unstable_cache(() => loadPublishedSnapshot(
        () => readPublic(origin, `/${username}?version=${state.version}`), state,
      ), ["published-portfolio", origin, username, state.version], {
        revalidate: 3600, tags: [portfolioCacheTag(username)],
      })();
    } catch (error) {
      if (!(error instanceof PublicationChangedError)) throw error;
    }
  }
  return null;
});

/** Published, explicitly opted-in usernames only; no owner IDs or private editing metadata. */
export async function getSearchVisiblePortfolios(): Promise<{ path: string; lastModified: string }[]> {
  const origin = parseBackendOrigin(process.env.DOTNET_API_URL);
  if (!origin) return [];
  const result: { path: string; lastModified: string }[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  // Leave room for the site's own URLs under the sitemap's 50,000-URL limit.
  for (let page = 0; page < 45; page++) {
    const body = await readPublic(origin, `?limit=1000${cursor ? `&after=${cursor}` : ""}`) as {
      portfolios?: { username?: unknown; publishedAt?: unknown }[]; nextCursor?: unknown;
    } | null;
    if (!body || !Array.isArray(body.portfolios)) throw new Error("Invalid public portfolio index.");
    for (const entry of body.portfolios) {
      if (typeof entry.username !== "string" || validateUsername(entry.username).length || seen.has(entry.username) ||
          typeof entry.publishedAt !== "string" || !Number.isFinite(Date.parse(entry.publishedAt)))
        throw new Error("Invalid public portfolio index entry.");
      seen.add(entry.username);
      result.push({ path: `/u/${entry.username}`, lastModified: entry.publishedAt });
    }
    if (body.nextCursor === null) return result;
    if (typeof body.nextCursor !== "string" || body.nextCursor === cursor || !seen.has(body.nextCursor))
      throw new Error("Invalid public portfolio cursor.");
    cursor = body.nextCursor;
  }
  throw new Error("Partition the portfolio sitemap before exceeding 45,000 opted-in portfolios.");
}
