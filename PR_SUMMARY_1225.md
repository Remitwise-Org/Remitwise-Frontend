## Summary

Add a `just check` recipe (and `npm run check`) that runs lint + typecheck + test in a single command, tightening the contributor feedback loop.

## Changes

- **`package.json`** – Added two npm scripts:
  - `typecheck`: runs `tsc` (TypeScript type-checking)
  - `check`: chains `npm run lint && npm run typecheck && npm test`
- **`justfile`** (new) – A `check` recipe that delegates to `npm run check`, giving `just` users a uniform entry point.
- **`CONTRIBUTING.md`** – Added `just check` and `npm run check` to the quick reference.
- **`docs/testing.md`** – Updated the pre-PR checklist to use `npm run typecheck` and `npm run check` instead of raw `npx tsc --noEmit`.
- **`docs/TESTING_STANDARDS.md`** – Updated the type-checking checklist item to prefer `npm run typecheck`.

## Usage

```bash
# With `just` installed
just check

# Without `just`
npm run check
```

## Idempotency

All scripts are safe to re-run. The `check` recipe and `check` script are simple sequential compositions of existing idempotent commands (`lint`, `tsc`, `test`).

Closes #1225
