# Transaction Detail (Receipt) Page — Data Flow

> **Audience:** Contributors working on `/receipt/[txHash]` — the standalone, shareable transaction-detail page (as opposed to the post-send confirmation modal documented in [docs/transaction-success-receipt.md](./transaction-success-receipt.md)).
> **Goal:** Trace exactly where the data on this page comes from, in what shape, and how failure is represented at each step, so a reviewer can check a change against the real flow instead of guessing.

## Route

```
GET /receipt/:txHash
```

`txHash` is a 64-character lowercase hex Stellar transaction hash, e.g.:

```
/receipt/3f8a1c2e5b7d9046a1f2e3c4d5b6a7980f1e2d3c4b5a69788796a5b4c3d2e1f0
```

## Flow, end to end

```
Request
  │
  ▼
app/receipt/[txHash]/page.tsx  (server component)
  │
  ├─ generateMetadata()
  │    isValidTxHash(txHash) → builds <title>/OG/Twitter tags
  │    (runs independently of the page body; a bad hash still gets a valid,
  │     generic metadata fallback rather than throwing)
  │
  └─ ReceiptPage()
       │
       ├─ isValidTxHash(txHash)?
       │    │
       │    ├─ false → notFound = true, receiptData stays null
       │    │
       │    └─ true  → fetchTransactionReceipt(txHash)   [lib/remittance/horizon.ts]
       │                 │
       │                 ├─ server.transactions().transaction(hash).call()
       │                 │    · 404 from Horizon  → fetchTransactionReceipt returns null
       │                 │    · any other error   → rethrown, caught by the page,
       │                 │                           notFound = true
       │                 │
       │                 └─ server.operations().forTransaction(hash).call()
       │                      · finds the payment op → amount / currency / recipient
       │                      · no payment op found  → amount="0", currency="XLM", recipient=""
       │
       │              → ReceiptData | null
       │
       ▼
<ReceiptPageContent txHash receiptData notFound />   (client component)
       │
       ├─ notFound || !isValidTxHash(txHash)
       │     → renders the "Invalid Transaction Hash" / "Transaction Not Found" state
       │       with a link back to /dashboard. No further data is read.
       │
       └─ otherwise → full receipt UI, driven entirely by the `receiptData` prop:
             status badge, amount hero, detail rows (hash / recipient / sender /
             date / fee / memo), share / print / explorer-link actions.
```

## Where each field on the page comes from

`ReceiptData` (`lib/remittance/horizon.ts`) is the single shape passed from the server component to `ReceiptPageContent`. Nothing on the page is fetched client-side — the client component is purely presentational over this prop.

| `ReceiptData` field | Horizon source | Notes |
|---|---|---|
| `hash` | the route param, echoed back | not re-validated against the tx record |
| `amount` | first `payment`-type operation for the tx | `"0"` if no payment op is found (e.g. a non-payment transaction) |
| `currency` | same operation's `asset_type`/`asset_code` | `"XLM"` for native, else the asset code, else `"UNKNOWN"` |
| `recipient` | same operation's `to` | `""` if no payment op is found |
| `sender` | `tx.source_account` | always present — comes from the transaction record itself, not the operation |
| `date` | `tx.created_at` | ISO 8601, formatted client-side in `ReceiptPageContent` via `toLocaleString` |
| `fee` | `tx.fee_charged` | stroops → XLM: `Number(fee_charged) / 1e7`, fixed to 7 decimals |
| `status` | `tx.successful` | `"completed"` or `"failed"` — there is no `"pending"` case here (unlike `fetchTransactionStatus`), because a transaction only reaches this endpoint once Horizon has it in a ledger |
| `memo` | `tx.memo_type === "text" ? tx.memo : undefined` | non-text memo types (`hash`, `return`, `id`) are not surfaced |

## Failure modes and what the user sees

| Condition | `notFound` | UI shown |
|---|---|---|
| `txHash` fails `isValidTxHash` (wrong length/charset) | `true` | "Invalid Transaction Hash" |
| Valid hash, Horizon returns 404 for the transaction | `true` | "Transaction Not Found" (copy also covers "may still be pending", since a not-yet-ledgered tx also 404s) |
| Valid hash, Horizon call throws for any other reason (network error, 5xx, timeout) | `true` | same "Transaction Not Found" state — the page does not currently distinguish "not found" from "upstream error" |
| Valid hash, transaction found | `false` | full receipt |

The last row is a known sharp edge worth knowing about if you touch this code: a transient Horizon outage currently renders the same "Transaction Not Found" copy as a transaction that genuinely doesn't exist. If you need to change that behavior, it belongs in `app/receipt/[txHash]/page.tsx`'s `catch` block, not in `ReceiptPageContent`.

## Files reference

| File | Role |
|---|---|
| `app/receipt/[txHash]/page.tsx` | Server component — route entry, SEO metadata, calls `fetchTransactionReceipt`, decides `notFound` |
| `lib/remittance/horizon.ts` | `fetchTransactionReceipt`, `isValidTxHash`, the `ReceiptData` type, and the underlying Horizon client |
| `components/ReceiptPageContent.tsx` | Client component — renders the not-found state or the full receipt from the `receiptData` prop; owns copy-to-clipboard, share, and print interactions |
| `components/PrintReceiptTemplate.tsx` | Hidden print-only layout rendered alongside the receipt for `window.print()` |
| `lib/config/seo.ts` (`RECEIPT_SEO`) | Fallback title/description/OG image used by `generateMetadata` |

## Cross-references

- [docs/transaction-success-receipt.md](./transaction-success-receipt.md) — the *other* receipt UI: the post-send confirmation modal on the Send Money page. Different component, different trigger (an in-flight send vs. navigating to a permalink), similar visual language.
- [docs/REMITTANCE_FLOW.md](./REMITTANCE_FLOW.md) — where a transaction hash comes from before a user ever reaches this page.
- [docs/CACHE_STRATEGY.md](./CACHE_STRATEGY.md) — this route sets no `revalidate`/`dynamic` export of its own, so it follows the app's default caching rules described there.
