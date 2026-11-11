import rulesData from "../../../shared/portfolio/rules.json" with { type: "json" };

/**
 * The portfolio rules shared with the backend. Numbers, reserved names and patterns live in
 * `shared/portfolio/rules.json`; the backend reads the same file.
 */
export interface PortfolioRules {
  version: number;
  themes: readonly string[];
  publishing: { policyVersion: string; minimumAge: number };
  requiredForPublish: readonly string[];
  maxItems: Readonly<Record<string, number>>;
  maxLength: Readonly<Record<string, number>>;
  multilineFields: readonly string[];
  text: { controlCharacters: string; htmlLike: string };
  link: {
    scheme: string;
    forbiddenCharacters: string;
    hostPattern: string;
    hostRestrictions: Readonly<Record<string, readonly string[]>>;
  };
  emailPattern: string;
  username: {
    minLength: number;
    maxLength: number;
    pattern: string;
    reserved: readonly string[];
    blockedWords: readonly string[];
  };
}

export const PORTFOLIO_RULES: PortfolioRules = rulesData;
