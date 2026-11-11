import type { PortfolioData } from "./types.ts";
import { validatePortfolio, validateUsername } from "./validation.ts";

export interface PublicPortfolioState {
  username: string;
  version: string;
  searchVisible: boolean;
  publishedAt: string;
}
export interface PublishedPortfolio extends PublicPortfolioState { data: PortfolioData }

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parsePublicState(value: unknown, username: string): PublicPortfolioState | null {
  if (!object(value) || validateUsername(username).length || value.username !== username ||
      typeof value.version !== "string" || !/^[a-f0-9]{64}$/.test(value.version) ||
      typeof value.searchVisible !== "boolean" || typeof value.publishedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.publishedAt) ||
      !Number.isFinite(Date.parse(value.publishedAt))) return null;
  return { username, version: value.version, searchVisible: value.searchVisible, publishedAt: value.publishedAt };
}
export function parsePublishedPortfolio(value: unknown, username: string, version: string): PublishedPortfolio | null {
  const state = parsePublicState(value, username);
  if (!state || state.version !== version || !object(value) || validatePortfolio(value.data, "publish").length) return null;
  return { ...state, data: value.data as PortfolioData };
}
export function portfolioCacheTag(username: string): string {
  if (validateUsername(username).length) throw new Error("Invalid portfolio username.");
  return `portfolio:${username}`;
}
