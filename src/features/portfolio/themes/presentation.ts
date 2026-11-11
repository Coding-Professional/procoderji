import type { PortfolioData } from "../types.ts";
import { validatePortfolio } from "../validation.ts";

export type PortfolioThemeId = "simple" | "developer";

export interface PortfolioProfileLink {
  label: string;
  href: string;
  external: boolean;
}

/** Use initials, never a remotely hosted profile photo. */
export function portfolioInitials(name: string | undefined): string {
  const words = (name ?? "").trim().split(/\s+/u).filter(Boolean);
  const initials = words.length > 1
    ? [Array.from(words[0])[0], Array.from(words[words.length - 1])[0]].join("")
    : Array.from(words[0] ?? "").slice(0, 2).join("");
  return Array.from(initials.toUpperCase().replace(/[^\p{L}\p{N}]/gu, "")).slice(0, 2).join("") || "ST";
}

/** Preview data can be incomplete while a student types; never turn an invalid URL into a link. */
export function portfolioProjectHref(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return validatePortfolio({ projects: [{ title: "Project", link: value }] }, "draft").length === 0
    ? value : null;
}

export function portfolioProfileLinks(data: PortfolioData): PortfolioProfileLink[] {
  const links: PortfolioProfileLink[] = [];
  for (const [key, label] of [["github", "GitHub"], ["linkedin", "LinkedIn"], ["website", "Website"]] as const) {
    const value = data.links?.[key];
    if (value?.trim() && validatePortfolio({ links: { [key]: value } }, "draft").length === 0)
      links.push({ label, href: value, external: true });
  }
  const email = data.links?.email;
  if (email?.trim() && validatePortfolio({ links: { email } }, "draft").length === 0)
    // The address validator allows literal `%` characters: encode them so a mail client
    // cannot interpret a percent-encoded newline as an additional message header.
    links.push({ label: email, href: `mailto:${encodeURIComponent(email)}`, external: false });
  return links;
}

/** Code-point truncation cannot split an emoji/surrogate pair in metadata. */
export function concisePortfolioText(value: string | undefined, max: number): string {
  const characters = Array.from((value ?? "").replace(/\s+/gu, " ").trim());
  return characters.length > max ? `${characters.slice(0, max - 1).join("")}…` : characters.join("");
}
