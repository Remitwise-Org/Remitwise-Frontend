/**
 * IBAN validation via the standard ISO 13616 MOD-97-10 checksum -- the
 * same algorithm every real IBAN validator uses, so no external dependency
 * is needed for it.
 *
 * Steps (per the spec):
 *  1. Strip spaces/formatting, uppercase.
 *  2. Structural check: 2 letters (country) + 2 digits (check digits) +
 *     up to 30 alphanumeric characters, 15-34 characters total (country
 *     lengths vary; this is the full valid range across all IBAN countries).
 *  3. Move the first 4 characters to the end (this is what "rearranged"
 *     means in the spec).
 *  4. Convert every letter to its two-digit position (A=10, B=11, ... Z=35).
 *  5. The resulting numeric string, mod 97, must equal 1.
 */

const STRUCTURE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

function letterToDigits(char: string): string {
  const code = char.charCodeAt(0);
  // A-Z => 10-35; digits pass through unchanged.
  return code >= 65 && code <= 90 ? String(code - 55) : char;
}

/** Computes `numericString mod 97` without overflowing `Number`'s safe
 * integer range, by folding the remainder through the string in chunks. */
function mod97(numericString: string): number {
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.slice(i, i + 7);
    remainder = Number(chunk) % 97;
  }
  return remainder;
}

/** Empty/whitespace-only input is treated as valid: an optional field
 * being unfilled isn't "invalid", it's "not provided yet". */
export function isValidIban(value: string): boolean {
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  if (normalized.length === 0) return true;

  if (!STRUCTURE.test(normalized)) return false;

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = Array.from(rearranged, letterToDigits).join("");

  return mod97(numeric) === 1;
}
