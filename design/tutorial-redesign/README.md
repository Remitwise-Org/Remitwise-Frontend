# Tutorial Redesign — Plan & Audit

Summary

- Goal: Redesign `app/tutorial/page.tsx` into short chapters with skip/resume and checkpoint progress. Produce Figma frames (mobile/tablet/desktop), annotated handoff, and a component inventory for engineering.

Route mapping (suggested)

- `app/tutorial` — tutorial index (current `page.tsx` -> list of tutorials)
- `app/tutorial/[tutorialId]/chapter/[chapterId]/page.tsx` — chapter view with checkpoints
- `app/tutorial/[tutorialId]/page.tsx` — tutorial overview with progress

Quick audit of current implementation (`app/tutorial/page.tsx`)

- Uses a simple static list of tutorials with single list page.
- Visuals use hard-coded hex colors and some non-standard Tailwind token syntax: `bg-(--background)`, `text-(--foreground)` — these are invalid Tailwind class names and must be replaced with tokens or utility classes.
- Accessibility concerns:
  - Background is `#141414` with text colors like `text-white` and `text-gray-400`. Need WCAG 2.1 AA contrast checks for each text size.
  - Interactive cards use `cursor-pointer` but lack keyboard focus styles / role/button semantics.
  - Touch target sizes for action areas should be >= 44x44px on mobile.
  - Hover-only color changes (group-hover) not sufficient for focus; explicit focus-visible states required.
- Patterns to preserve: rounded cards, subtle gradients, accent color `#D72323` (brand red).

Gaps vs requirements

- No chapter-level screens, checkpoints, or resume/skip controls yet.
- No progress state persisted (e.g., localStorage or server-side progress tracking).
- No accessible focus styles or aria attributes for cards and controls.
- Tailwind config needs extension for design tokens (colors, radii, spacing) or use existing utilities.

Initial component/state inventory (proposed)

- `TutorialList` — list container used on `app/tutorial` (currently `page.tsx`)
- `TutorialCard` — card per tutorial (title, description, duration, thumbnail/icon, progress indicator)
- `TutorialOverview` — tutorial home with progress summary
- `ChapterView` — shows a single short chapter (content, media if any)
- `CheckpointList` — list of checkpoints inside `ChapterView`
- `ChapterControls` — skip/resume, next, previous, mark complete
- `ProgressBar` — linear/pips indicator for chapter progress
- `PlaybackButton` — play/pause for micro-video content

Design tokens & Tailwind notes

- Added tokens in `tailwind.config.js`: `foreground`, `bg1`, `bg2`, `bg3`, `surface`, `border`, `muted`, plus existing `brand.red`.
- Use classes like `bg-bg1`, `bg-bg2`, `bg-bg3`, `bg-surface`, `border-border`, `text-foreground`, `text-muted`, and `bg-brand-red` instead of raw hex values.
- Prefer `theme.extend.colors` in `tailwind.config.js` rather than inline hex classes.
- Add `focus-visible` ring and increase default `borderRadius` options if needed.

Annotated handoff items (to produce in Figma)

- Breakpoints: mobile (375w), tablet (768w), desktop (1280w)
- Spacing scale (xs/s/m/l/xl) matched to Tailwind spacing tokens
- Type styles: H1/H2/H3/Body/Small (font family, weight, sizes, line-height)
- Component states: default, hover, focus, active, disabled, loading, error
- Interaction notes: keyboard order, skip/resume animation, saving progress (client vs server)

Open questions (product/engineering)

- Persistence: should progress be saved server-side per user or locally (localStorage)?
- Copy: confirm microcopy for `Skip`, `Resume`, `Checkpoint complete` states.
- Edge cases: can users revisit completed chapters? Are chapters skippable in any order?
- Analytics: what events should be tracked (chapter started, skipped, completed)?
- Contract: Is the 40–80 hour estimate per major area acceptable for delivery planning?

Next steps I can take now

1. Produce a route mapping PR sketch and small refactor to split `page.tsx` into `TutorialList` + `TutorialCard` components.
2. Create a Figma-ready spec (PNG/MD mockup assets) if you don't have direct Figma access.
3. Create accessibility checklist and initial WCAG contrast report for current colors.

Files created/edited

- Design plan: [design/tutorial-redesign/README.md](design/tutorial-redesign/README.md#L1)
- Source audited: [app/tutorial/page.tsx](app/tutorial/page.tsx#L1)

If you'd like, I can now:

- Create the component skeletons in the codebase and open a branch/PR draft.
- Generate the WCAG contrast report for the colors used.
- Draft the Figma frames as static PNGs and a handoff file you can import.

Which of the above should I do next? If you prefer I start with code, I will scaffold `TutorialCard` and `TutorialList` components and wire a route structure.
