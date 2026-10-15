// App-facing accessors for the guides and jobs data files.
import guidesData from "@/data/guides.json";
import jobsData from "@/data/jobs.json";
import { sortGuides, type GuidesData } from "./guides";
import type { JobsData } from "./jobs";

export const getGuides = () => sortGuides((guidesData as unknown as GuidesData).guides);
export const getJobs = () => (jobsData as unknown as JobsData).jobs;
