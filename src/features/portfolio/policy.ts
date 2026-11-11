import { PORTFOLIO_RULES } from "./rules.ts";

/** Product publishing policy shared with the backend, not a claim of age verification. */
export const PORTFOLIO_PUBLISHING_POLICY = Object.freeze({
  policyVersion: PORTFOLIO_RULES.publishing.policyVersion,
  minimumAge: PORTFOLIO_RULES.publishing.minimumAge,
});

export const PORTFOLIO_POLICY_VERSION = PORTFOLIO_PUBLISHING_POLICY.policyVersion;
export const PORTFOLIO_MINIMUM_AGE = PORTFOLIO_PUBLISHING_POLICY.minimumAge;
