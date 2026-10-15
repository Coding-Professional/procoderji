// App-facing, data-bound versions of the catalogue helpers.
import coursesData from "@/data/courses.json";
import type { CoursesData, Unit } from "@/types/global";
import { resolvePath, contentRoutes, sitemapRoutes } from "./catalog";

export const catalog = coursesData as unknown as CoursesData;

export const getCourses = () => catalog.courses;
export const resolveSlugs = (slugs: string[]) => resolvePath(catalog, slugs);
export const getContentRoutes = () => contentRoutes(catalog);
export const getSitemapRoutes = (hasNote?: (unit: Unit) => boolean) => sitemapRoutes(catalog, hasNote);
