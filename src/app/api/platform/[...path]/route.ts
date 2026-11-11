import { NextRequest, NextResponse } from "next/server";
import { isBackendPath, parseBackendOrigin } from "@/features/account/config";

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
  if (!isBackendPath(path)) return error("Unknown learner endpoint.", 404);
  const backend = parseBackendOrigin(process.env.DOTNET_API_URL);
  if (!backend) {
    if (path === "auth/session" && request.method === "GET")
      return NextResponse.json(
        { configured: false, user: null, csrfToken: null },
        { headers: privateHeaders },
      );
    return error(
      "Account sync is not enabled. You can continue practising on this device.",
      503,
    );
  }
  const headers = new Headers();
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
  if (request.method !== "GET") {
    if (request.headers.get("origin") !== request.nextUrl.origin)
      return error("Use the current site to update your account.", 403);
    if (Number(request.headers.get("content-length")) > LIMIT)
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
          if (size > LIMIT) {
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
    const responseHeaders = new Headers(privateHeaders);
    for (const name of ["content-type", "location", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie())
      responseHeaders.append("set-cookie", cookie);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return error(
      "The account service is temporarily unavailable. Your browser progress is still available.",
      503,
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
