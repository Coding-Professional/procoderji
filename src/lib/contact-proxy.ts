import { isIP } from "node:net";

/** Accept platform-overwritten IP headers only on Vercel. Local development shares one allowance. */
export function contactClientIp(headers: Headers, vercel: boolean): string | null {
  if (!vercel) return "127.0.0.1";
  const ip = headers.get("x-vercel-forwarded-for")?.trim();
  return ip && isIP(ip) ? ip : null;
}
