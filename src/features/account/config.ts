/** Trusted server configuration only. Browser input never selects an upstream host. */
export function parseBackendOrigin(value: string | undefined): string | null {
  if (!value || value !== value.trim() || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** The authorization location must come from the trusted .NET upstream, never browser input. */
export function canonicalGoogleChallenge(requestUrl: string, authorizationLocation: string | null): string | null {
  if (!authorizationLocation) return null;
  try {
    const request = new URL(requestUrl);
    const authorization = new URL(authorizationLocation);
    if (authorization.origin !== "https://accounts.google.com" || authorization.username || authorization.password) return null;
    const callback = new URL(authorization.searchParams.get("redirect_uri") ?? "");
    const localHttp = callback.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(callback.hostname);
    if ((callback.protocol !== "https:" && !localHttp) || callback.username || callback.password ||
      callback.pathname !== "/api/platform/signin-google" || callback.search || callback.hash || callback.origin === request.origin) return null;
    const destination = new URL("/api/platform/auth/google", callback.origin);
    const returnTo = request.searchParams.get("returnTo");
    if (returnTo !== null) destination.searchParams.set("returnTo", returnTo);
    return destination.href;
  } catch {
    return null;
  }
}

export const BACKEND_PATHS = new Set([
  "auth/session",
  "auth/google",
  "auth/logout",
  "signin-google",
  "progress",
  "portfolio",
  "portfolio/draft",
  "portfolio/username",
  "portfolio/publish",
  "portfolio/unpublish",
]);

/** Only a validated username may extend the public portfolio path. */
export function isBackendPath(path: string): boolean {
  if (BACKEND_PATHS.has(path)) return true;
  const prefix = "portfolio/public/";
  if (!path.startsWith(prefix)) return false;
  const username = path.slice(prefix.length);
  return username.length >= 3 && username.length <= 30 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username);
}
