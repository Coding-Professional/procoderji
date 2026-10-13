// App-facing, data-bound versions of the catalogue helpers.
import coursesData from "@/data/courses.json";
import type { CoursesData } from "@/types/global";
import { resolvePath, contentRoutes } from "./catalog";

export const catalog = coursesData as unknown as CoursesData;

export const getCourses = () => catalog.courses;
export const resolveSlugs = (slugs: string[]) => resolvePath(catalog, slugs);
export const getContentRoutes = () => contentRoutes(catalog);
