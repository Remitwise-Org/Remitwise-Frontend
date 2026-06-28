/**
 * Internal helpers shared by the locale-aware formatting components.
 *
 * Marked private-ish: callers outside of `@/components/i18n/*` should not
 * rely on these symbols. They live in a private sibling module to keep the
 * public API of `@/components/i18n` narrow.
 */

/**
 * Sanitize an arbitrary locale string into a tag suitable for a
 * `data-*` attribute. Returns `"unknown"` for nullish or empty input.
 *
 * Only ASCII letters and hyphens are preserved (matching the character
 * class used by BCP-47), so a hostile or malformed string from a call
 * site can't inject arbitrary attribute content.
 */
export function localeTag(locale: string | null | undefined): string {
  if (!locale) return "unknown";
  const cleaned = locale.replace(/[^A-Za-z-]/g, "");
  return cleaned || "unknown";
}
