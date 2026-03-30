# Tutorial Redesign — Annotated Handoff

Overview

- Purpose: Hand off the redesigned tutorial chapter experience for engineering implementation and accessibility review.
- Files: component implementations in `components/tutorials/*`, routes under `app/tutorial/*`, and design tokens in `tailwind.config.js`.

Breakpoints

- Mobile: 375w (iPhone 8/SE baseline)
- Tablet: 768w
- Desktop: 1280w

Design tokens (tailwind)

- Colors (use classes):
  - `text-foreground` -> #ffffff
  - `text-muted` -> #9CA3AF
  - `bg-bg1` -> #141414
  - `bg-bg2` -> #0f0f0f
  - `bg-bg3` -> #0a0a0a
  - `bg-surface` -> #1a1a1a
  - `border-border` -> #2a2a2a
  - `bg-brand-red` -> #D72323
  - `bg-brand-redHover` -> #B91C1C
- Spacing: `space-xs` 4px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 32px
- Focus: use `ring-focus` (3px) and `ring-offset-focus` (4px)

Type styles

- H1: 28px/36px - `text-3xl font-bold`
- H2: 24px/32px - `text-2xl font-bold`
- H3: 18px/24px - `text-lg font-semibold`
- Body: 16px/24px - `text-base`
- Small: 14px/20px - `text-sm`

Component inventory & states

- `TutorialCard`
  - States: default, hover, focus-visible, active
  - Behavior: full-card link, keyboard focus (use `focus-visible:ring-focus`), progress bar shows percentage.
- `TutorialList`
  - Grid: 1 / 2 / 3 columns responsive
- `ChapterView`
  - Checkpoints: tappable rows with `aria-pressed`, toggles persisted in `localStorage`.
  - Controls: `Skip` (marks complete and advances), `Resume` (keeps state), `Back to overview`.
  - States: checkpoint open vs done, disabled states (if needed), loading (media)

Accessibility notes (WCAG 2.1 AA target)

- Contrast: primary text on `bg-bg1` and `bg-bg2` meets AA for body text; brand red does NOT meet AA for small body text on dark backgrounds — only use brand red for accents and primary CTA backgrounds with white text.
- Keyboard:
  - All cards and controls must be reachable by keyboard (tab), with `focus-visible` ring using `ring-focus`/`ring-offset-focus` in brand red.
  - Checkpoints should use `role="button"` or native `button` and `aria-pressed` for toggled state.
- Touch targets: ensure tappable areas are at least 44x44px on mobile.

Interaction notes

- Skip: marks current chapter checkpoints complete and navigates to the next chapter (or overview if last).
- Resume: restores the session; if media, resume playback position if available.
- Checkpoint toggle: instant toggle with accessible label and status readout.

Redlines / measurements (critical screen: ChapterView mobile)

- Outer card padding: `space-md` (16px)
- Checkpoint row height: min 48px, inner padding `space-sm` (8px)
- Progress bar height: 8px, corner radius 9999 (pill)
- Primary CTA (Skip): padding `px-4 py-2`, radius `rounded-lg`

Dev notes

- Tokens are defined in `tailwind.config.js`. Prefer using those tokens rather than inline hex values.
- Persistence: current impl uses `localStorage` keys `remitwise:tutorial:{tutorialId}:progress` storing `{ chapters: { [chapterId]: { checkpoints: [bool] } } }`.

Open questions for product/engineering

- Persistence: server-side or client-only? If server, what API contract and auth scope?
- Copy: confirm microcopy for `Skip` / `Resume` / checkpoint names.
- Analytics: list of events to track (chapter_started, chapter_skipped, checkpoint_toggled, chapter_completed).

Files to review

- Components: `components/tutorials/TutorialCard.tsx`, `components/tutorials/TutorialList.tsx`, `components/tutorials/ChapterView.tsx`
- Routes: `app/tutorial/page.tsx`, `app/tutorial/[tutorialId]/page.tsx`, `app/tutorial/[tutorialId]/chapter/[chapterId]/page.tsx`
- Tokens: `tailwind.config.js`

Handoff checklist

- [ ] Design frames uploaded to Figma with named pages + dev-mode redlines
- [x] Token list included in `tailwind.config.js`
- [x] Component skeletons implemented in React
- [x] Local persistence implemented for checkpoints
- [ ] Engineer review scheduled

Contact

- Ask here for changes to tokens, copy, or persistence strategy.
