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

export const BACKEND_PATHS = new Set([
  "auth/session",
  "auth/google",
  "auth/logout",
  "signin-google",
  "progress",
]);
