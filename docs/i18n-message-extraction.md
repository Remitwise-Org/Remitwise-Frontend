# How i18n messages are extracted

Audience: contributors adding or changing any user-facing string.

There is no automated string-extraction tool in this repo (no
`i18next-parser`, no CI check that scans for hardcoded strings) — pulling a
string out of a component and into the translation system is a manual,
three-step process. This doc is that process.

## The three steps

1. **Pick a key path.** Keys are dot-separated and nested by feature area,
   matching the JSON structure in `lib/i18n/locales/en.json` — e.g.
   `transactionHistory.filtersHeading`, `errors.network`. Put a new key
   under the feature's existing top-level object rather than inventing a
   new one for a single string.

2. **Add the string to every locale file, in the same place.**
   `lib/i18n/locales/en.json` and `lib/i18n/locales/es.json` must stay
   structurally identical — same keys, same nesting, same order. Add the
   English string and its Spanish translation in the same PR; do not land
   an English-only key and leave Spanish for later; see
   [`docs/i18n-string-expansion-handoff.md`](i18n-string-expansion-handoff.md)
   for the coverage this is meant to protect.

3. **Replace the hardcoded string with a `t()` call.**

   - Client Components: `useClientTranslator()` from `lib/i18n/client.ts`.
     ```tsx
     "use client";
     import { useClientTranslator } from "@/lib/i18n/client";

     export default function Example() {
       const { t } = useClientTranslator();
       return <h1>{t("transactionHistory.title")}</h1>;
     }
     ```
   - Server-side (route handlers, middleware): `getTranslator(request)` from
     `lib/i18n/index.ts`, which resolves the locale from the request's
     cookie/`Accept-Language` header rather than from client state.

## Interpolation

Use `{{variableName}}` inside the string, and pass the values as the second
argument to `t()`:

```json
"showing": "Showing {{count}} of {{total}}"
```

```tsx
t("transactionHistory.showing", { count: 5, total: 42 })
```

## Fallback behavior

`t(path)` resolves in this order: the current locale's tree → the English
tree → the raw `path` string itself. A missing Spanish translation silently
falls back to English rather than rendering blank or throwing — which is
exactly why step 2 (keeping both files structurally identical) matters: a
key present only in `en.json` is invisible to this fallback check and will
just look like a missing translation with no signal that it's missing.

## Locale resolution

`lib/i18n/resolve-locale.ts` picks the active locale from (in order) the
`SupportedLocale` cookie, then the request's `Accept-Language` header /
`navigator.language`, then the `en` default. See `lib/i18n/cookie.ts` for
the full `SUPPORTED_LOCALES` list.
