import { NextRequest, NextResponse } from "next/server";
import { canonicalGoogleChallenge, isBackendPath, parseBackendOrigin } from "@/features/account/config";
import { revalidateTag } from "next/cache";
import { portfolioCacheTag } from "@/features/portfolio/public-model";
import { validateUsername } from "@/features/portfolio/validation";
import { contactClientIp } from "@/lib/contact-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Origin",
  "X-Robots-Tag": "noindex",
};
const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: privateHeaders });
const LIMIT = 256 * 1024;

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  const contact = path === "contact" || path === "contact/config";
  const contactUnavailable = "Message submission is temporarily unavailable. Please try again later.";
  if (contact && request.method !== (path === "contact" ? "POST" : "GET"))
    return error("This method is not available.", 405);
  if (!isBackendPath(path)) return error("Unknown learner endpoint.", 404);
  const backend = parseBackendOrigin(process.env.DOTNET_API_URL);
  if (!backend) {
    if (path === "auth/session" && request.method === "GET")
      return NextResponse.json(
        { configured: false, user: null, csrfToken: null },
        { headers: privateHeaders },
      );
    return error(
      contact ? contactUnavailable : "Account sync is not enabled. You can continue practising on this device.",
      503,
    );
  }
  const headers = new Headers();
  if (contact) {
    const key = process.env.CONTACT_PROXY_KEY;
    if (!key || key.length < 32) return error(contactUnavailable, 503);
    headers.set("X-Contact-Proxy-Key", key);
    const ip = contactClientIp(request.headers, process.env.VERCEL === "1");
    if (!ip) return error("Your connection could not be verified. Please try again.", 400);
    headers.set("X-Contact-Client-IP", ip);
  }
  for (const name of [
    "cookie",
    "origin",
    "content-type",
    "x-account-id",
    "x-csrf-token",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body: Uint8Array | undefined;
  const bodyLimit = contact ? 32 * 1024 : LIMIT;
  if (request.method !== "GET") {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      return error(contact ? "Submit your message from this website." : "Use the current site to update your account.", 403);
    if (Number(request.headers.get("content-length")) > bodyLimit)
      return error("The request is too large.", 413);
    const reader = request.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > bodyLimit) {
            await reader.cancel();
            return error("The request is too large.", 413);
          }
          chunks.push(chunk.value);
        }
        body = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.byteLength;
        }
      } catch {
        return error("The request body could not be read.", 400);
      } finally {
        reader.releaseLock();
      }
    }
  }
  try {
    const upstream = await fetch(
      `${backend}/api/platform/${path}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: body as BodyInit | undefined,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (path === "auth/google" && request.method === "GET" && upstream.status === 302) {
      const canonical = canonicalGoogleChallenge(request.url, upstream.headers.get("location"));
      if (canonical) {
        // Restart on the callback host before forwarding a host-only correlation cookie.
        return new Response(null, { status: 307, headers: { ...privateHeaders, Location: canonical } });
      }
    }
    const responseHeaders = new Headers(privateHeaders);
    for (const name of ["content-type", "location", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append("set-cookie", cookie);
    if (upstream.ok && request.method !== "GET" && ["portfolio/publish", "portfolio/unpublish", "portfolio"].includes(path)) {
      const username = upstream.headers.get("x-portfolio-username");
      if (username && validateUsername(username).length === 0) {
        try { revalidateTag(portfolioCacheTag(username), { expire: 0 }); }
        catch { console.error("Portfolio cache invalidation was unavailable; fresh publication checks remain active."); }
      }
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return error(
      contact ? contactUnavailable : "The account service is temporarily unavailable. Your browser progress is still available.",
      503,
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
