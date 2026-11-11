import { test } from "node:test";
import assert from "node:assert/strict";
import { createPortfolioClient, PortfolioApiError, readOwnPortfolio } from "./client.ts";

const identity = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", csrfToken: "current-token" };
const revision = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const record = { username: "riya-student", data: { name: "Riya" }, searchVisible: false, status: "draft", revision,
  createdAt: "2026-11-11T00:00:00.000Z", updatedAt: "2026-11-11T00:00:00.000Z", publishedAt: null };
const response = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers });

test("owner reads bind identity, avoid caching and whitelist validated portfolio fields", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "/api/platform/portfolio");
    assert.equal(new Headers(init?.headers).get("X-Account-Id"), identity.userId);
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.credentials, "same-origin");
    return response({ portfolio: { ...record, userId: "must-not-be-retained" }, publishingEnabled: true, policyVersion: "2026-11-11", minimumPublishingAge: 18 });
  };
  const workspace = await readOwnPortfolio(identity.userId, undefined, fetcher);
  assert.equal(workspace.portfolio?.data.name, "Riya");
  assert.equal(workspace.policyVersion, "2026-11-11");
  assert.ok(!("userId" in workspace.portfolio!));
});

test("drafts and publication send the exact revision, current antiforgery token and eligibility", async () => {
  const requests: { path: string; body: unknown }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(init?.method, "POST");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("X-Account-Id"), identity.userId);
    assert.equal(headers.get("X-CSRF-Token"), identity.csrfToken);
    requests.push({ path: String(url), body: JSON.parse(String(init?.body)) });
    return response({ portfolio: record });
  };
  const client = createPortfolioClient(identity, fetcher);
  await client.saveDraft({ name: "Riya" }, false, null);
  await client.publish(revision, "2026-11-11");
  assert.deepEqual(requests, [
    { path: "/api/platform/portfolio/draft", body: { data: { name: "Riya" }, searchVisible: false, revision: null } },
    { path: "/api/platform/portfolio/publish", body: { revision, eligibility: { atLeast18: true, policyVersion: "2026-11-11" } } },
  ]);
});

test("stale writes and rate limits retain server codes for recovery without retrying writes", async () => {
  let calls = 0;
  const stale: typeof fetch = async () => { calls++; return response({ code: "stale-revision", error: "Refresh before trying again." }, 409); };
  await assert.rejects(createPortfolioClient(identity, stale).saveDraft({}, false, revision), (error: unknown) => error instanceof PortfolioApiError && error.status === 409 && error.code === "stale-revision");
  assert.equal(calls, 1);
  const limited: typeof fetch = async () => response({ code: "rate-limited", error: "Wait before trying again." }, 429, { "Retry-After": "37" });
  await assert.rejects(createPortfolioClient(identity, limited).claimUsername("riya-student", revision), (error: unknown) => error instanceof PortfolioApiError && error.retryAfterSeconds === 37);
});

test("malformed saved data and private metadata cannot become an editor record", async () => {
  const fetcher: typeof fetch = async () => response({ portfolio: { ...record, data: { links: { website: "javascript:alert(1)" } } }, publishingEnabled: true });
  await assert.rejects(readOwnPortfolio(identity.userId, undefined, fetcher), (error: unknown) => error instanceof PortfolioApiError && error.code === "invalid-response");
});

test("missing antiforgery or invalid usernames are rejected before a network call", async () => {
  const fetcher: typeof fetch = async () => { throw new Error("The network must not be called."); };
  await assert.rejects(createPortfolioClient({ ...identity, csrfToken: null }, fetcher).saveDraft({}, false, null), (error: unknown) => error instanceof PortfolioApiError && error.code === "sign-in-required");
  await assert.rejects(createPortfolioClient(identity, fetcher).checkUsername("../admin"), (error: unknown) => error instanceof PortfolioApiError && error.problems[0].path === "username");
});

test("portfolio deletion is an authenticated revision-bound DELETE with an empty success body", async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "/api/platform/portfolio");
    assert.equal(init?.method, "DELETE");
    assert.deepEqual(JSON.parse(String(init?.body)), { revision });
    assert.equal(new Headers(init?.headers).get("X-CSRF-Token"), identity.csrfToken);
    return new Response(null, { status: 204 });
  };
  await createPortfolioClient(identity, fetcher).delete(revision);
});
