/** Operator-controlled deployment context; never infer it from a visitor's Host header. */
export function isNonProductionDeployment(
  environment: string | undefined,
  vercelEnvironment: string | undefined,
): boolean {
  return environment === "staging" || vercelEnvironment === "preview";
}
