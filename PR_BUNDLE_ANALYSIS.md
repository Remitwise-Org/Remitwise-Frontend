# Pull Request: Add docs/BUNDLE_ANALYSIS.md workflow doc

**Closes #1113**

## Summary

Add a contributor-facing guide that documents how to run, interpret, and act on the Next.js bundle analyzer output. Bundle analysis knowledge was previously tribal; this makes it discoverable for new contributors and reviewers.

## What changed

| File | Change |
|------|--------|
| `docs/BUNDLE_ANALYSIS.md` | **New** — 126-line guide covering: audience (contributors), why bundle size matters, how to run the analyzer (macOS/Linux/Windows), report locations, treemap interpretation (stat/parsed/gzipped), bottleneck identification, and remediation strategies (dynamic imports, tree shaking, lightweight alternatives). |
| `README.md` | Added "Bundle Analysis" section linking to the new doc + project structure tree entry. |
| `next.config.js` | Wired `@next/bundle-analyzer` via `withBundleAnalyzer()`, gated behind `ANALYZE=true` env var. |
| `docs/LOAD_TIME_BUDGETS.md` | Updated "Build-time bundle size check" section to reference the new guide; added cross-link to the related-documents table; updated future enhancement note. |
| `package.json` | Added `@next/bundle-analyzer: ^16.2.11` as devDependency; removed duplicate `check:img-alt` script entry. |

## How to verify

1. **Run the analyzer locally:**
   ```bash
   # macOS/Linux
   ANALYZE=true npm run build

   # Windows PowerShell
   $env:ANALYZE="true"; npm run build
   ```
   Confirm three HTML reports appear in `.next/analyze/`: `client.html`, `server.html`, `edge.html`.

2. **Open `client.html` in a browser** and verify the interactive treemap loads with stat/parsed/gzipped size tooltips.

3. **Lint passes** — `npm run lint` is clean (pre-existing errors in unrelated files are unchanged).

4. **Unit tests pass** — `npm run test:unit` passes all 102 tests (26 node + 76 vitest).

## Implementation notes

- The analyzer is **local-only** — no CI step added. This matches the current workflow where bundle review is a manual contributor responsibility.
- `ANALYZE=true` is the only env gate; no additional config files or GitHub Actions changes needed.
- The `next.config.js` change wraps the existing `withSentryConfig()` call — order is `withBundleAnalyzer(withSentryConfig(...))` which is the recommended composition pattern.
- Fixed a pre-existing duplicate `check:img-alt` script entry in `package.json` (line 14 was a duplicate of line 12).

## Out of scope (follow-up issues)

- CI integration for automated bundle size budgets (noted as future enhancement in `LOAD_TIME_BUDGETS.md`).
- An `npm run analyze` convenience script wrapping `ANALYZE=true npm run build`.
