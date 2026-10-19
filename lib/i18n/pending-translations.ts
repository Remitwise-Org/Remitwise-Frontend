import en from "./locales/en.json";
import es from "./locales/es.json";

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTree = Record<string, TranslationValue>;

/** Flattens a nested translation tree into dot-path keys, e.g.
 * `{ errors: { generic: "..." } }` -> `["errors.generic"]`. */
function flattenKeys(tree: TranslationValue, prefix = ""): string[] {
  if (typeof tree === "string") return [prefix];

  return Object.entries(tree).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

/**
 * Returns every key present in `en.json` but missing from `es.json` --
 * i.e. every string that will silently fall back to English for a Spanish
 * user (see lib/i18n/client.ts's fallback chain and
 * docs/i18n-message-extraction.md). Keys added only to a non-English
 * locale (present in es.json but not en.json) are out of scope here: `t()`
 * always falls back to the English tree, so a key missing from en.json
 * would render as a raw path string regardless of locale, a different
 * (and louder) failure mode than a silent fallback.
 */
export function getPendingTranslationKeys(): string[] {
  const enKeys = new Set(flattenKeys(en as TranslationTree));
  const esKeys = new Set(flattenKeys(es as TranslationTree));

  return [...enKeys].filter((key) => !esKeys.has(key)).sort();
}
