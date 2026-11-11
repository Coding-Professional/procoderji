import type { PortfolioData, PortfolioProblem } from "./types.ts";
import { validatePortfolio, validateUsername } from "./validation.ts";

export interface OwnedPortfolio {
  username: string | null;
  data: PortfolioData;
  searchVisible: boolean;
  status: "draft" | "published" | "suspended";
  revision: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PortfolioWorkspace {
  portfolio: OwnedPortfolio | null;
  publishingEnabled: boolean;
  policyVersion: string | null;
  minimumPublishingAge: number | null;
}

export interface PortfolioIdentity {
  userId: string;
  csrfToken: string | null;
}

export class PortfolioApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problems: PortfolioProblem[];
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status: number, code: string, problems: PortfolioProblem[] = [], retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "PortfolioApiError";
    this.status = status;
    this.code = code;
    this.problems = problems;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type Fetcher = typeof fetch;
const ROOT = "/api/platform/portfolio";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new PortfolioApiError("The portfolio response could not be read. Refresh and try again.", 502, "invalid-response");
}

function parseRecord(value: unknown): OwnedPortfolio {
  if (!object(value) || !object(value.data) || validatePortfolio(value.data, "draft").length !== 0
    || typeof value.revision !== "string" || !GUID.test(value.revision)
    || typeof value.searchVisible !== "boolean"
    || typeof value.status !== "string" || !["draft", "published", "suspended"].includes(value.status)
    || typeof value.createdAt !== "string" || typeof value.updatedAt !== "string"
    || (value.publishedAt !== null && typeof value.publishedAt !== "string")
    || (value.username !== null && validateUsername(value.username).length !== 0)) invalidResponse();
  return {
    username: value.username as string | null,
    data: value.data as PortfolioData,
    searchVisible: value.searchVisible,
    status: value.status as OwnedPortfolio["status"],
    revision: value.revision,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    publishedAt: value.publishedAt as string | null,
  };
}

function signalWithTimeout(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function request(path: string, userId: string, options: RequestInit, fetcher: Fetcher): Promise<unknown> {
  try {
    const headers = new Headers(options.headers);
    headers.set("X-Account-Id", userId);
    const response = await fetcher(ROOT + path, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      headers,
    });
    if (response.status === 204) return null;
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code = object(body) && typeof body.code === "string" ? body.code : "unavailable";
      const message = object(body) && typeof body.error === "string" ? body.error : "Your portfolio could not be updated. Try again.";
      const problems = object(body) && Array.isArray(body.problems)
        ? body.problems.filter((problem): problem is PortfolioProblem => object(problem) && typeof problem.path === "string" && typeof problem.code === "string") : [];
      const retry = Number(response.headers.get("Retry-After"));
      throw new PortfolioApiError(message, response.status, code, problems, Number.isFinite(retry) && retry > 0 ? retry : null);
    }
    return body;
  } catch (cause) {
    if (cause instanceof PortfolioApiError) throw cause;
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new PortfolioApiError("The account service is unavailable. Your edits are still here; try again before leaving this page.", 503, "unavailable");
  }
}

/** Read only the current authenticated account's private workspace. */
export async function readOwnPortfolio(userId: string, signal?: AbortSignal, fetcher: Fetcher = fetch): Promise<PortfolioWorkspace> {
  const body = await request("", userId, { signal: signalWithTimeout(signal) }, fetcher);
  if (!object(body) || typeof body.publishingEnabled !== "boolean" || !("portfolio" in body)) invalidResponse();
  return {
    portfolio: body.portfolio === null ? null : parseRecord(body.portfolio),
    publishingEnabled: body.publishingEnabled,
    policyVersion: typeof body.policyVersion === "string" && body.policyVersion.length > 0 ? body.policyVersion : null,
    minimumPublishingAge: typeof body.minimumPublishingAge === "number" ? body.minimumPublishingAge : null,
  };
}

/** Browser mutations carry the account's current antiforgery token and expected revision. */
export function createPortfolioClient(identity: PortfolioIdentity, fetcher: Fetcher = fetch) {
  async function write(path: string, body: unknown, method = "POST") {
    if (!identity.userId || !identity.csrfToken)
      throw new PortfolioApiError("Refresh your account session before saving.", 401, "sign-in-required");
    return request(path, identity.userId, {
      method,
      headers: { "Content-Type": "application/json", "X-CSRF-Token": identity.csrfToken },
      body: JSON.stringify(body),
      signal: signalWithTimeout(),
    }, fetcher);
  }

  async function mutation(path: string, body: unknown) {
    const response = await write(path, body);
    if (!object(response)) invalidResponse();
    return parseRecord(response.portfolio);
  }

  return {
    saveDraft: (data: PortfolioData, searchVisible: boolean, revision: string | null) => mutation("/draft", { data, searchVisible, revision }),
    claimUsername: (username: string, revision: string | null) => mutation("/username", { username, revision }),
    async checkUsername(username: string) {
      const problems = validateUsername(username);
      if (problems.length) throw new PortfolioApiError("Choose a valid username before checking availability.", 400, "validation-failed", problems);
      const body = await request(`/username?username=${encodeURIComponent(username)}`, identity.userId, { signal: signalWithTimeout() }, fetcher);
      if (!object(body) || body.username !== username || typeof body.available !== "boolean") invalidResponse();
      return body.available;
    },
    publish: (revision: string, policyVersion: string) => mutation("/publish", { revision, eligibility: { atLeast18: true, policyVersion } }),
    unpublish: (revision: string) => mutation("/unpublish", { revision }),
    async delete(revision: string) {
      const result = await write("", { revision }, "DELETE");
      if (result !== null) invalidResponse();
    },
  };
}
