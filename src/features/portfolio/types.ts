export type PortfolioMode = "draft" | "publish";

export type PortfolioProblemCode =
  | "required"
  | "invalid-type"
  | "unknown-field"
  | "too-short"
  | "too-long"
  | "too-many"
  | "invalid-characters"
  | "html-like"
  | "invalid-format"
  | "invalid-link"
  | "invalid-host"
  | "invalid-email"
  | "reserved"
  | "blocked-word";

/** A validation problem at a field path such as `projects[0].link`. */
export interface PortfolioProblem {
  path: string;
  code: PortfolioProblemCode;
}

export interface PortfolioProject {
  title: string;
  link?: string;
  technologies?: string[];
  description?: string;
}

export interface PortfolioEducation {
  institution: string;
  degree?: string;
  period?: string;
  details?: string;
}

export interface PortfolioExperience {
  organization: string;
  role: string;
  period?: string;
  description?: string;
}

export interface PortfolioLinks {
  github?: string;
  linkedin?: string;
  website?: string;
  /** An email address. The page builds the `mailto:` link; students never store one. */
  email?: string;
}

/** A valid portfolio. A draft may omit `name` and `headline`; a published one may not. */
export interface PortfolioData {
  name?: string;
  headline?: string;
  about?: string;
  skills?: string[];
  projects?: PortfolioProject[];
  education?: PortfolioEducation[];
  experience?: PortfolioExperience[];
  achievements?: string[];
  links?: PortfolioLinks;
}
