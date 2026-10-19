# String Normalisation

**Audience:** contributors adding new API routes, form inputs, or validation logic.

This document describes every place the codebase trims whitespace, casefolds,
or otherwise normalises a string before storing, comparing, or forwarding it.
Keeping this behaviour consistent and documented prevents subtle bugs where the
same address or currency code is treated as two different values depending on
where it was entered.

---

## Table of Contents

1. [Whitespace trimming](#whitespace-trimming)
2. [Casefolding](#casefolding)
3. [Byte-order mark (BOM)](#byte-order-mark-bom)
4. [Where normalisation happens](#where-normalisation-happens)
5. [Adding a new input — checklist](#adding-a-new-input--checklist)

---

## Whitespace trimming

All external string inputs are trimmed of leading and trailing ASCII whitespace
before any further processing. The project uses `String.prototype.trim()`
throughout — `trimStart`/`trimEnd` are not used.

### What gets trimmed

| Input | Location | Trimmed value used for |
|-------|----------|------------------------|
| Stellar recipient address | `lib/hooks/useStellarAddressValidation.ts` | Checksum validation and display |
| Stellar recipient address | `app/api/remittance/build/route.ts` | On-chain transaction destination |
| Currency code | `app/api/remittance/build/route.ts` | Asset selection (`XLM` / `USDC`) |
| Transaction memo | `app/api/remittance/build/route.ts` | Stellar `Memo.text` |
| `x-admin-key` header | `lib/admin/auth.ts` | Timing-safe secret comparison |
| Admin cookie values | `lib/admin/auth.ts` | Timing-safe secret comparison |
| `ADMIN_SECRET` env var | `lib/admin/auth.ts` | Stored comparison target |
| Search / filter query | `app/transactions/page.tsx` | Client-side transaction filtering |
| Goal name / ID / description | `lib/validation/savings-goals.ts` | Non-empty checks |

### Concrete examples

```ts
// lib/hooks/useStellarAddressValidation.ts
export const normalizeStellarAddress = (value: string) =>
  value.toUpperCase().replace(/\s+/g, '').trim();

// app/api/remittance/build/route.ts
const recipientAddress = o.recipientAddress.trim();
const currency = typeof o.currency === 'string'
  ? o.currency.trim().toUpperCase()
  : 'USDC';
const memo = typeof o.memo === 'string' ? o.memo.trim() : undefined;

// lib/admin/auth.ts
const headerSecret = request.headers.get('x-admin-key')?.trim();

// app/transactions/page.tsx
function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}
```

### Embedded whitespace in Stellar addresses

`normalizeStellarAddress` goes one step further than `trim()`: it strips **all**
whitespace characters (spaces, tabs, newlines) from anywhere in the string, not
just the ends. This handles addresses copied from PDFs or messaging apps that
wrap long strings mid-line.

```ts
// Before: "GBRPYHIL 2PEKAZFQAQLB\nKARD53YKPN"
// After:  "GBRPYHIL2PEKAZFQAQLBKARD53YKPN..."
value.toUpperCase().replace(/\s+/g, '').trim()
```

---

## Casefolding

The project applies casefolding in two directions depending on context.

### Uppercase — addresses and currency codes

Stellar public keys and ISO-4217 currency codes are **always uppercased** before
validation, storage, and forwarding. The Stellar protocol is case-sensitive and
requires uppercase Base32 encoding; uppercasing on ingestion means the rest of
the codebase can rely on a single canonical form.

```ts
// lib/validation/percentages.ts — server-side validation
const normalizedAddress = address.trim().toUpperCase();
StrKey.isValidEd25519PublicKey(normalizedAddress); // requires uppercase

// app/api/remittance/quote/route.ts — Zod schema
const currencyCode = z.string()
  .regex(/^[A-Za-z]{3}$/, 'must be a 3-letter ISO currency code')
  .toUpperCase();  // "usd" → "USD" before the route handler runs
```

The quote API also lowercases the assembled cache key so that equivalent
requests hit the same cache entry regardless of how the client formatted them:

```ts
// app/api/remittance/quote/route.ts
const cacheKey = `${data.amount}:${data.currency}:${data.toCurrency}`.toLowerCase();
// "100:USD:PHP" and "100:usd:php" resolve to the same key
// (currency fields were already uppercased by the Zod schema;
//  the .toLowerCase() here is belt-and-suspenders for the amount)
```

### Lowercase — search and comparisons

Free-text search and field-name matching are **always lowercased** so that the
comparison is case-insensitive.

```ts
// app/transactions/page.tsx
function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}
// searchable text is also .toLowerCase()'d before the .includes() check

// lib/sanitize.ts — sensitive-field matching in log sanitisation
const lowerKey = key.toLowerCase();
if (SENSITIVE_FIELDS.has(lowerKey)) { … }
```

### Locale tag sanitisation

`localeTag()` in `components/i18n/internal.ts` strips everything except ASCII
letters and hyphens from a locale string before writing it into a `data-*`
attribute. This is not a case transformation but prevents malformed locale
strings from injecting arbitrary attribute content.

```ts
// components/i18n/internal.ts
export function localeTag(locale: string | null | undefined): string {
  if (!locale) return 'unknown';
  const cleaned = locale.replace(/[^A-Za-z-]/g, '');
  return cleaned || 'unknown';
}
```

---

## Byte-order mark (BOM)

**The codebase does not currently contain explicit BOM-stripping code.** No
call to `.charCodeAt(0) === 0xFEFF`, `replace(/^\uFEFF/, '')`, or
`String.prototype.normalize()` was found at the time of writing.

### What this means in practice

A UTF-8 BOM (`\uFEFF`) prepended to a pasted Stellar address would survive into
`normalizeStellarAddress` and cause `StrKey.isValidEd25519PublicKey` to return
`false`, surfacing as a checksum error to the user. The same applies to a
currency code pasted from a BOM-prefixed file.

### Current mitigation

`normalizeStellarAddress` strips all whitespace including Unicode whitespace
categories matched by the `\s+` regex. `\uFEFF` is classified as a Unicode
whitespace character in JavaScript's `\s` pattern, so BOM characters embedded
within the string body — but **not** at the leading edge after `trim()` — would
be removed. A leading BOM on the raw input is removed by `trim()` because
JavaScript's `String.prototype.trim()` removes `\uFEFF`.

```ts
'  \uFEFFGBRPYHIL2PEKAZFQ…'.trim()
// → 'GBRPYHIL2PEKAZFQ…'   ✓  BOM removed

'\uFEFFGBRPYHIL2PEKAZFQ…'.trim()
// → 'GBRPYHIL2PEKAZFQ…'   ✓  leading BOM removed

'GBRPY\uFEFFHIL2PEKAZFQ…'.replace(/\s+/g, '').trim()
// → 'GBRPYHIL2PEKAZFQ…'   ✓  mid-string BOM removed
```

If explicit BOM handling is required for other input surfaces (e.g. file
upload, CSV import), add a dedicated strip step and track it here.

---

## Where normalisation happens

Normalisation is applied at **two layers**. Both are intentional.

### UI layer (`lib/hooks/`, `app/**/components/`)

`normalizeStellarAddress` is called on every keystroke, paste, and
recent-recipient click inside `RecipientAddressInput`. The user sees the
normalised value immediately, so there is no surprise when the form is
submitted.

```ts
// app/send/components/RecipientAddressInput.tsx
const handleInputChange = (value: string) => {
  setAddress(normalizeStellarAddress(value));
};

const handlePasteFromClipboard = async () => {
  const clipboardText = await navigator.clipboard.readText();
  setAddress(normalizeStellarAddress(clipboardText));
};
```

### API layer (`app/api/`, `lib/validation/`, `lib/admin/`)

Server-side routes re-apply trimming and casefolding on every inbound request.
The UI layer is convenience; the API layer is the **authoritative enforcement
point**. Never skip normalisation in an API route on the assumption that the
client already did it.

---

## Adding a new input — checklist

When adding a new string input that will be validated, stored, or forwarded:

1. **Trim** the raw value before any length or format check.
2. **Uppercase** if the value is a Stellar address, currency code, or other
   protocol-level identifier that is case-sensitive in uppercase form.
3. **Lowercase** if the value will be used for free-text comparison or as a
   map/cache key.
4. **Strip internal whitespace** (`.replace(/\s+/g, '')`) if users might paste
   from sources that wrap long strings (addresses, public keys, identifiers).
5. Apply normalisation at the **API layer** even if the UI already does it.
6. Add the new input to the table in [Whitespace trimming](#whitespace-trimming)
   above and update this document in the same PR.
