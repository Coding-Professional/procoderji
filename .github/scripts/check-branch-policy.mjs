import { pathToFileURL } from "node:url";

export function branchPolicy({ base, head, sourceRepository, repository }) {
  if (!base || !head || !sourceRepository || !repository) return "Pull-request branch metadata is incomplete.";
  if (base === "dev") return null;
  if (base === "main" && head === "dev" && sourceRepository === repository) return null;
  if (base === "main") {
    return "Production PRs must promote this repository's dev branch. Send feature and dependency PRs to dev first.";
  }
  return "Contributions target dev; production promotions target main.";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failure = branchPolicy({
    base: process.env.PR_BASE,
    head: process.env.PR_HEAD,
    sourceRepository: process.env.PR_SOURCE_REPOSITORY,
    repository: process.env.TARGET_REPOSITORY,
  });
  if (failure) {
    console.error(failure);
    process.exitCode = 1;
  } else {
    console.log("Branch policy passed.");
  }
}
