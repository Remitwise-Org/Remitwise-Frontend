# Canonicalisation

**Audience:** contributors adding or modifying API routes, form inputs, or
validation logic.

This document describes how RemitWise normalises strings and byte sequences
before comparing, storing, or forwarding them. All three concerns — whitespace
trimming, casefolding, and byte-order — are covered in one place so reviewers
can verify new code against a single written intent rather than reading every
prior commit.

For a broader list of which specific fields are trimmed and where, see
[docs/string-normalisation.md](string-normalisation.md).

---

## Table of Contents

1. [Whitespace trimming](#whitespace-trimming)
2. [Casefolding](#casefolding)
3. [Byte-order](#byte-order)
4. [Enforcement layers](#enforcement-layers)
5. [Checklist for new inputs](#checklist-for-new-inputs)

---

## Whitespace trimming

**Rule:** every external string is trimmed of leading and trailing whitespace
before any other processing. `String.prototype.trim()` is used project-wide;
`trimStart` / `trimEnd` are not.

For Stellar addresses an additional step strips **all** internal whitespace
(spaces, tabs, newlines) so that addresses copied from PDFs or messaging apps
that wrap long strings mid-line are handled correctly.

### Real entry-points

```ts
// lib/hooks/useStellarAddressValidation.ts
// Called on every keystroke and paste inside RecipientAddressInput.
export const normalizeStellarAddress = (value: string) =>
  value.toUpperCase().replace(/\s+/g, '').trim();

// app/api/remittance/build/route.ts  (server-side, authoritative enforcement)
const recipientAddress = o.recipientAddress.trim();
const currency =
  typeof o.currency === 'string' ? o.currency.trim().toUpperCase() : 'USDC';
const memo = typeof o.memo === 'string' ? o.memo.trim() : undefined;

// lib/admin/auth.ts
const headerSecret = request.headers.get('x-admin-key')?.trim();
```

### Memo byte length

`trim()` is applied **before** the 28-byte Stellar memo limit is checked, so
leading/trailing whitespace does not consume any of the 28-byte budget:

```ts
// app/api/remittance/build/route.ts
const memo = typeof o.memo === 'string' ? o.memo.trim() : undefined;
if (memo) {
  const byteLength = new TextEncoder().encode(memo).length;
  if (byteLength > 28) {
    throw new Error('memo must be 28 bytes or less');
  }
}
```

`TextEncoder` always produces UTF-8 bytes, so a 28-character ASCII memo uses
exactly 28 bytes, but a memo containing multi-byte Unicode characters (e.g.
accented letters, CJK) may exceed 28 bytes with fewer than 28 visible
characters.

---

## Casefolding

### Uppercase — addresses and currency codes

Stellar public keys and asset codes are **always uppercased** on ingestion. The
Stellar protocol encodes public keys in Base32 with uppercase letters; a
lowercase character will fail `StrKey.isValidEd25519PublicKey` even if the
underlying bytes are otherwise valid.

```ts
// utils/validation.ts
export function validateRecipientAddress(address: string): ValidationError | null {
  const normalizedAddress = address.trim().toUpperCase();
  // ...
  if (!StrKey.isValidEd25519PublicKey(normalizedAddress)) { … }
}

// app/api/v1/anchor/deposit/route.ts
const currency = input.currency.trim().toUpperCase();
// "usd" → "USD", "usdc" → "USDC"
```

### Lowercase — free-text search and cache keys

Search queries and cache keys are **always lowercased** so identical values
entered in different cases resolve to the same bucket:

```ts
// app/transactions/page.tsx
function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

// app/api/remittance/quote/route.ts
// currency fields were already uppercased by the Zod schema;
// .toLowerCase() here covers the numeric amount segment.
const cacheKey =
  `${data.amount}:${data.currency}:${data.toCurrency}`.toLowerCase();
// "100:USD:PHP" and "100:usd:php" both produce "100:usd:php"
```

### Locale tag sanitisation

Locale strings written into `data-*` HTML attributes are stripped of
everything except ASCII letters and hyphens. This is not a case change but
prevents malformed locale strings from injecting arbitrary attribute content:

```ts
// components/i18n/internal.ts
export function localeTag(locale: string | null | undefined): string {
  if (!locale) return 'unknown';
  const cleaned = locale.replace(/[^A-Za-z-]/g, '');
  return cleaned || 'unknown';
}
```

---

## Byte-order

### UTF-8 BOM (`\uFEFF`)

The codebase does not contain a dedicated BOM-stripping step. However, the
combination of `trim()` and the internal-whitespace regex in
`normalizeStellarAddress` removes BOM characters in all practical positions:

```ts
// JavaScript's String.prototype.trim() removes \uFEFF
'  \uFEFFGBRPYHIL2PEKAZFQ…'.trim()
// → 'GBRPYHIL2PEKAZFQ…'   ✓  leading BOM removed

// \uFEFF is matched by \s in JavaScript's regex engine
'GBRPY\uFEFFHIL2PEKAZFQ…'.replace(/\s+/g, '').trim()
// → 'GBRPYHIL2PEKAZFQ…'   ✓  mid-string BOM removed
```

If a BOM appears in a context that does not pass through `normalizeStellarAddress`
(e.g. a CSV upload or a future freeform text field), explicit BOM stripping
must be added and documented here.

### Webhook payload bytes

Webhook signatures are verified over the **raw request body bytes** without any
re-encoding. `lib/webhooks/verify.ts` coerces a `string` payload into a
`Buffer` via `Buffer.from(payload)`, which uses UTF-8 encoding — matching the
encoding the signing party used when constructing the HMAC:

```ts
// lib/webhooks/verify.ts
function toBuffer(payload: string | Buffer): Buffer {
  return typeof payload === 'string' ? Buffer.from(payload) : payload;
}

function verifyHmacSha256(payload: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)   // raw UTF-8 bytes, no transformation
    .digest();
  return safeEqual(provided, expected);
}
```

Signature strings themselves are decoded from either hex or base64 before
comparison. Known vendor prefixes (`sha256=`, `v1=`) are stripped first:

```ts
// lib/webhooks/verify.ts
function decodeSignature(signature: string): Buffer | null {
  const normalized = stripKnownPrefixes(signature); // removes "sha256=", "v1="
  if (/^[0-9a-f]+$/i.test(normalized) && normalized.length % 2 === 0) {
    return Buffer.from(normalized, 'hex');
  }
  try {
    return Buffer.from(normalized, 'base64');
  } catch {
    return null;
  }
}
```

All comparisons use `crypto.timingSafeEqual` to prevent timing side-channels.

### Auth nonce bytes

The 32-byte nonce issued by `/api/auth/nonce` travels as a hex string. During
verification the server converts it back to a `Buffer` before calling
`Keypair.verify`:

```ts
// README: Authentication & Signature Verification
// The message signed by the wallet is the byte representation of the hex nonce.
const nonceBuffer = Buffer.from(nonce, 'hex');        // 32 bytes
const signatureBuffer = Buffer.from(signature, 'base64');
Keypair.fromPublicKey(address).verify(nonceBuffer, signatureBuffer);
```

The encoding at each step is fixed — hex for the nonce, base64 for the
signature — so there is no ambiguity about byte-order or encoding at the
verification site.

### Stellar Lumens amounts (stroops)

On-chain amounts are handled as integers in **stroop** units
(1 XLM = 10 000 000 stroops). The validation layer uses `BigInt` arithmetic to
avoid floating-point rounding:

```ts
// utils/validation.ts
const amountBigInt = BigInt(amount);          // "1000000" → 1_000_000n
const maxAmount    = BigInt('1000000000000'); // 100 000 XLM ceiling
```

When building a Stellar transaction the amount is formatted with exactly
7 decimal places as required by the Stellar SDK:

```ts
// app/api/remittance/build/route.ts
amount: request.amount.toFixed(7),  // 1.5 → "1.5000000"
```

---

## Enforcement layers

Normalisation is applied at **two independent layers**. Both are intentional.

| Layer | Where | Purpose |
|-------|-------|---------|
| **UI** | `lib/hooks/`, `app/**/components/` | Shows the user the normalised value immediately on keystroke / paste so there is no surprise at submission. |
| **API** | `app/api/`, `lib/validation/`, `lib/admin/` | Authoritative enforcement point. Every inbound request is normalised here regardless of what the client sent. |

Never skip normalisation in an API route on the assumption that the client
already did it.

---

## Checklist for new inputs

When adding a new string input that will be validated, stored, or forwarded:

1. **Trim** the raw value with `.trim()` before any length or format check.
2. **Strip internal whitespace** (`.replace(/\s+/g, '')`) if users might paste
   from sources that wrap long strings — addresses, public keys, identifiers.
3. **Uppercase** if the value is a Stellar address, asset code, or other
   protocol-level identifier that is case-sensitive and expects uppercase form.
4. **Lowercase** if the value is used for free-text comparison or as a
   map / cache key.
5. Enforce normalisation at the **API layer** even if the UI already does it.
6. Add the new input to the table in
   [docs/string-normalisation.md](string-normalisation.md) and update this
   document in the same PR.
7. If the input may carry a BOM (e.g. content from a file upload), add an
   explicit `replace(/^\uFEFF/, '')` step and note it in the
   [Byte-order](#byte-order) section above.
