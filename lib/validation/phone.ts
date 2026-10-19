import { isValidPhoneNumber } from "libphonenumber-js";

/**
 * Validates a phone number via `libphonenumber-js`. Requires an
 * international, `+`-prefixed number (e.g. `"+234 801 234 5678"`) since
 * there is no country selector alongside this field to supply a default
 * region -- `libphonenumber-js` can't validate a bare national number
 * without one.
 *
 * An empty/whitespace-only value is treated as valid: this field isn't
 * required, and "not filled in yet" shouldn't be reported as "invalid".
 */
export function isValidProfilePhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;

  try {
    return isValidPhoneNumber(trimmed);
  } catch {
    return false;
  }
}
