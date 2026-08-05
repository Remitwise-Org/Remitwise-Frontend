/**
 * True when `value` has at most `maxDecimals` digits after the decimal
 * point. Operates on the original string representation (via `toString()`)
 * rather than scaling and comparing floats, which would be unreliable for
 * values whose decimal part doesn't round-trip exactly through IEEE 754
 * (e.g. `0.1 + 0.2`).
 */
export function hasAtMostDecimals(value: number, maxDecimals: number): boolean {
  if (!Number.isFinite(value)) return false;

  // Values in scientific notation (e.g. 1e-9) have no literal "." to count
  // digits after -- treat as failing the check rather than mis-parsing.
  const str = value.toString();
  if (str.includes("e") || str.includes("E")) return false;

  const decimalPart = str.split(".")[1];
  return !decimalPart || decimalPart.length <= maxDecimals;
}
