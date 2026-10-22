export const SEAL_PREFIX = "bw1.";

export function isSealed(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(SEAL_PREFIX);
}
