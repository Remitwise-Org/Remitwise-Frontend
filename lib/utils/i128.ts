/** Maximum value representable by Soroban's `i128` contract type. */
export const I128_MAX = 170141183460469231731687303715884105727n;

/** Stellar's native asset precision (7 decimal places, i.e. stroops). */
export const STELLAR_DECIMALS = 7;

/**
 * The largest "major unit" amount (e.g. dollars, not stroops) that can be
 * multiplied by `10^STELLAR_DECIMALS` without overflowing `i128`.
 */
export const MAX_I128_MAJOR_UNITS = Number(I128_MAX / 10n ** BigInt(STELLAR_DECIMALS));

/**
 * True when `amount`, once converted to its on-chain minor-unit
 * representation (`amount * 10^STELLAR_DECIMALS`), would still fit in an
 * `i128`. Also rejects non-finite input (`NaN`/`Infinity`), which would
 * otherwise silently propagate through downstream fee/rate arithmetic.
 */
export function fitsInI128(amount: number): boolean {
  return Number.isFinite(amount) && Math.abs(amount) <= MAX_I128_MAJOR_UNITS;
}

export const STROOPS_PER_UNIT = 10_000_000n;

export function toStroops(decimalString: string): bigint {
  if (typeof decimalString !== "string" || decimalString.trim() === "") throw new Error("toStroops: input must be a non-empty string");
  const trimmed = decimalString.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`toStroops: invalid decimal string "${decimalString}"`);
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > 7) throw new Error(`toStroops: too many decimal places (${frac.length}), max 7`);
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt(frac.padEnd(7, "0"));
}

export function fromStroops(stroops: bigint): string {
  if (stroops < 0n) throw new Error("fromStroops: negative stroops not allowed");
  const whole = stroops / STROOPS_PER_UNIT;
  const frac = (stroops % STROOPS_PER_UNIT).toString().padStart(7, "0");
  return `${whole}.${frac}`;
}
