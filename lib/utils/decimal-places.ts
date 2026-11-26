/**
 * True when `value` has at most `maxDecimals` digits after the decimal
 * point. Operates on the original string representation (via `toString()`)
 * rather than scaling and comparing floats, which would be unreliable for
 * values whose decimal part doesn't round-trip exactly through IEEE 754
 * (e.g. `0.1 + 0.2`).
 */
export function hasAtMostDecimals(value: number | string, maxDecimals: number): boolean {
  if (typeof value === 'number' && !Number.isFinite(value)) return false;

  const str = typeof value === 'string' ? value : value.toString();
  const scientific = /^([+-]?\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/.exec(str);
  if (scientific) {
    const exponent = Number(scientific[3]);
    if (!Number.isSafeInteger(exponent)) return false;
    return Math.max(0, (scientific[2]?.length ?? 0) - exponent) <= maxDecimals;
  }
  if (str.includes("e") || str.includes("E")) return false;

  const decimalPart = str.split(".")[1];
  return !decimalPart || decimalPart.length <= maxDecimals;
}
