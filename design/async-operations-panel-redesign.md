# Async operations panel — Redesign spec

Scope: UI/UX specification only. Reference components: components/AsyncOperationsPanel.tsx, components/AsyncSubmissionStatus.tsx, app/split/page.tsx, app/bills/page.tsx

Branch: uiux/async-operations-panel-redesign

Goal
- Surface long-running Stellar contract operations clearly without competing with primary form content. Keep users informed with crisp status tokens, minimal copy, and a collapse/expand pattern that prioritises the active operation.

1. High-level rules
- Non-modal, non-blocking presentation.
- Minimal copy: status tokens + one-line progress summary (verb + subject). Keep details collapsible.
- The active operation is visually prominent; queued items are subdued; completed/failed items are compact entries in history.

2. Status semantics and tokens
- Active — token: blue dot + animated pulse, label: `In progress`.
  - Meaning: request submitted -> awaiting wallet signature or network confirmation.
- Queued — token: gray hollow dot, label: `Queued`.
  - Meaning: waiting behind active operations; low priority in visual hierarchy.
- Complete — token: green check circle, label: `Completed` + timestamp.
- Failed — token: red exclamation circle, label: `Failed` + short reason (1 line). Offer `Retry` action.

3. Per-item compact card (closed state)
- Layout (width: 320px desktop rail item; full-width mobile inline):
  - Left: status token (24px visual)
  - Middle: title (14px semibold) + single-line summary (12px) truncated with ellipsis
  - Right: chevron toggle (expand/collapse) and optional action (retry for failed)
- Visual weight: active item gets a subtle elevated card (box-shadow) and a 2px left accent bar in token color.

4. Expanded item (details)
- Reveals: step list (build, wallet signature, submit, confirm), timestamps for completed steps, error message for failed step, link to transaction/explorer.
- Keep expanded height limited; if content exceeds 320px, internal scroll only.

5. Panel placement and responsive rules
- Desktop (>= 1024px)
  - Placement: top-right floating rail anchored under header (right gutter). Panel collapsed by default to a compact rail (max-width 360px) showing up to 3 items stacked vertically.
  - Default collapsed state: show active item + a compact summary of queued count (e.g., `2 queued`).
  - Expand behavior: clicking the rail expands to a taller floating panel (max-height 420px) with internal scroll for history.
- Mobile (<= 767px)
  - Placement: inline under the primary form (following the submit button) as a compact stack. Do NOT float; avoid covering primary content.
  - Default collapsed state: show only active item with chevron; expand to full-width inline list (bottom sheet optional for very small screens).

6. Collapse/expand behaviour
- Two affordances to expand/collapse: chevron on each item and panel-level toggle.
- Initial state: collapsed. When an active operation starts, the rail briefly (2s) pulses to draw attention but does not auto-expand. If user expands, panel remains open until they collapse or navigate away.
- Collapsing rules: users can collapse panel at any time; when collapsed, only 1–3 item summaries visible depending on viewport.

7. Interaction and keyboard/a11y
- Panel and items use `role="region"` with accessible name `Operations`.
- Toggle buttons: `aria-expanded` and `aria-controls` properly set.
- Keyboard:
  - Tab to panel toggle, Enter/Space to expand/collapse.
  - When expanded, arrow keys move between items; Enter toggles item expansion.
  - Esc collapses the panel (if expanded) or closes any open item detail.
- Live region
  - A polite `aria-live="polite"` element announces status changes like: "Operation X started", "Operation X completed", "Operation X failed: <reason>".
  - Announcements are brief and limited to major state transitions to avoid verbosity.

8. Visual redlines & spacing
- Rail item: height 56px collapsed; padding 12px; gap 8px.
- Active item accent: 2px left bar; 8px border-radius; subtle drop shadow: 0 6px 14px rgba(0,0,0,0.08).
- Tokens: 24px visual; icons sized to 16px inside.

9. Error handling and retry
- Failed item shows one-line error and `Retry` action inline. Retry triggers same flow and marks item `Queued`.
- Provide an optional `Dismiss` for completed items to clear them from the rail; auto-truncate history to last 10 items.

10. Minimal copy examples
- Active: "Building contract — awaiting signature"
- Queued: "Queued — waiting for signature"
- Complete: "Submitted — confirmed (2m)"
- Failed: "Failed — signature rejected"

11. QA checklist
- Visual QA at 375px and 1280px: ensure rail does not obscure primary form; active item prominent.
- Accessibility:
  - Live region announces start/completion/failure.
  - Keyboard: panel toggle, item expand/collapse, Esc collapse.
  - Focus not stolen on status updates; only focus changes on explicit user action.
- Run:
  - `npm run build`
  - `npm run lint`

12. Implementation notes for handoff
- Provide two CSS states: `.ops--collapsed` and `.ops--expanded` and per-item `.ops-item--active`, `.ops-item--queued`, `.ops-item--complete`, `.ops-item--failed`.
- Provide data attributes to populate step states and timestamps: `data-op-id`, `data-op-state`, `data-op-steps`.
- Ensure live region is configurable and debounced to avoid announcement flooding.

13. Commit message (suggested)
feat(uiux): redesign async contract operations progress ui

References
- docs/async-contract-submissions-handoff.md
