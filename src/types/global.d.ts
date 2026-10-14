export interface CoursesData {
  courses: Course[];
}

export interface Course {
  slug: string;
  title: string;
  branches: Branch[];
}

export interface Branch {
  slug: string;
  title: string;
  /** Short label for compact UI (e.g. "CSE"). Falls back to title. */
  short?: string;
  semesters: Semester[];
}

export interface Semester {
  slug: string;
  title: string;
  subjects: Subject[];
}

export interface Subject {
  slug: string;
  title: string;
  /** Short original description of the subject (used on the page and in search results). */
  desc?: string;
  units: Unit[];
}

export interface Unit {
  slug: string;
  title: string;
  path: string; // MDX file path, relative to src/content
  desc?: string;
  /** ISO date (YYYY-MM-DD) the unit was first published. */
  addedAt?: string;
  /** ISO date (YYYY-MM-DD) of the last substantive edit. */
  updatedAt?: string;
}

export {};
