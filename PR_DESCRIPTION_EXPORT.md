# Implement Transaction History Export to CSV and JSON

## Summary

This PR implements a fully client-side transaction history export feature on the standalone `/transactions` page. 

**Key achievement**: Users can now select and download their currently filtered transactions (respecting active search, date ranges, types, and statuses) in either CSV or JSON formats. 

- **CSV Export**: Fully RFC 4180 compliant with proper escaping of special characters (commas, double quotes, and newlines).
- **JSON Export**: Provides raw data exchange format with pretty-printed indentation.
- **Dynamic Filename**: Filenames automatically embed active date ranges and a ISO timestamp (e.g. `remitwise-transactions_2026-06-01_to_2026-06-20_2026-06-21T07-47-57.csv`).
- **Interactive UI**: A custom-styled, accessible dropdown menu has been added directly to the "Export" button, offering a clear UX selection.

Closes #412

## Type of change

- [x] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code change that neither fixes a bug nor adds a feature
- [ ] `perf` — performance improvement
- [x] `test` — adding or updating tests
- [ ] `docs` — documentation only
- [ ] `ci` — CI / workflow changes
- [ ] `chore` — dependency bump or tooling update

## Scope

- [ ] Contract (`contracts/`)
- [x] Frontend / Web (`app/`, `lib/`, `tests/`)
- [ ] Docs (`docs/`)
- [ ] CI / Ops (`.github/`)

---

## What changed and why

### `lib/utils/export-serializer.ts` [NEW]

Created a dedicated, robust serializer utility:
- `escapeCsvField`: Escapes fields containing commas, double quotes, or newlines, ensuring standard compatibility with downstream tools like Excel.
- `serializeToCsv`: Transforms mapped rows into a comma-separated string, adding standard column headers.
- `serializeToJson`: Formats records into a formatted JSON string.
- `getExportFilename`: Dynamic helper creating consistent filenames using search dates and the download timestamp.

---

### `app/transactions/page.tsx` [MODIFY]

- Integrated a custom selection dropdown beside the download icon.
- Handled click-outside and `Escape` key events to close the dropdown gracefully.
- Configured screen reader accessibility tags: `aria-expanded`, `aria-haspopup`, and custom `aria-label` attributes.
- Wired the export button `disabled` state directly to the filtered transaction count (disabled on empty results).

---

### `vitest.config.mts` [MODIFY]

- Expanded include patterns to pick up component test files (`*.test.tsx`) under `tests/unit/`.
- Expanded coverage include patterns to cover Next.js page components (`app/**/*.tsx`).

---

### `tests/unit/utils/export-serializer.test.ts` [NEW]

Added 12 unit tests covering all formatting features:
- ✅ Return empty strings on null/undefined values.
- ✅ Standard strings output without modifying quotes/escapes.
- ✅ Field values containing commas wrapped in quotes.
- ✅ Quotes inside fields doubled and wrapped.
- ✅ Line breaks and carriage returns enclosed in double quotes.
- ✅ Empty lists handled gracefully with headers.
- ✅ Valid JSON structure output and pretty-print layout.
- ✅ Correct dynamic filenames generated under various date filter combinations.

---

### `tests/unit/transactions/page.test.tsx` [NEW]

Added 6 component integration tests utilizing React Testing Library and Vitest fake timers:
- ✅ Export button rendered and enabled by default (when transactions exist).
- ✅ Dropdown opens on click and triggers CSV download.
- ✅ Dropdown opens on click and triggers JSON download.
- ✅ Export button is disabled when search matches nothing (empty filtered list).
- ✅ Dropdown closes on pressing the `Escape` key.
- ✅ Dropdown closes on clicking outside.

---

## Acceptance criteria

| Requirement | Status |
|---|---|
| Client-side export on `/transactions` respecting active filters | ✅ |
| Supports both CSV and JSON formats | ✅ |
| Generates a Blob and prompts browser download | ✅ |
| Filename contains date range / download timestamp | ✅ |
| CSV serializer properly escapes commas, quotes, and newlines | ✅ |
| Export button disabled on empty filtered results | ✅ |
| Accessible names and ARIA attributes for controls | ✅ |
| Unit and component tests pass successfully | ✅ |
| No TypeScript or lint warnings | ✅ |

---

## Edge cases covered

- **Fields with multiple quotes/commas**: Correctly serialized and escaped per RFC 4180.
- **Empty filtered results**: The export trigger remains fully disabled, preventing dropdown interactions.
- **Dropdown dismissal**: Click outside, Escape key press, and option selection all correctly close the dropdown state.
- **Timezone-agnostic timestamps**: Filenames use UTC ISO string values with sanitised character separators for file systems.

---

## Breaking changes

None. All interfaces and hooks are fully backwards compatible.
