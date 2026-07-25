# Skeleton: shimmer and static variants, with a reduced-motion fallback

Closes #932 — https://github.com/Remitwise-Org/Remitwise-Frontend/issues/932

## Summary

`<Skeleton />` now has two variants. The static one is what users see when they
have asked their OS for reduced motion.

```tsx
<Skeleton className="h-4 w-24 rounded" />                  // shimmer (default)
<Skeleton variant="static" className="h-4 w-24 rounded" /> // never animates
```

`variant="shimmer"` means "animate *unless the user asked us not to*". It is not
an override: under `prefers-reduced-motion: reduce` a shimmer skeleton renders
identically to a static one. This satisfies WCAG 2.1 SC 2.2.2 (Pause, Stop,
Hide) — the shimmer is an automatic animation that runs for more than five
seconds and has no pause control.

Pass `variant="static"` when a surface should never animate regardless of the
user's setting.

## Why the fallback is CSS and not the existing hook

The repository already has `usePrefersReducedMotion()` (`lib/hooks/`), and it is
the right tool for JS-driven animation. It is deliberately not used here:

- it returns `false` on the server, so the shimmer would flash on first paint
  before hydration corrected it;
- it would risk a hydration mismatch;
- it would force `Skeleton` to become a client component, and the
  `app/**/loading.tsx` routes that render it are server components.

The rule lives in `app/globals.css` instead.

It clears `background-image` as well as `animation`. Stopping the animation
alone — which is all the pre-existing global `animate-shimmer` rule does — leaves
the gradient frozen part-way through its sweep, which reads as a lopsided
highlight rather than a placeholder. That older rule is untouched and still
covers the other `animate-shimmer` call sites.

## Accessibility

The skeletons previously carried no semantics at all: a screen reader met a run
of unlabelled empty divs on every loading route.

- Every `<Skeleton />` is now `aria-hidden="true"`. The shapes carry no
  information, and walking forty unlabelled boxes is worse than silence.
- A new `<SkeletonGroup />` wraps a loading surface in `role="status"` +
  `aria-busy="true"` with an `sr-only` label, e.g. "Loading transaction
  history". `role="status"` is polite, so it does not interrupt.
- `SkeletonGroup` accepts `className`, so it replaces an existing layout wrapper
  rather than adding a DOM level. The diff in `LoadingSkeletons.tsx` is one line
  per page skeleton with no structural change.
- `SkeletonCard`, `SkeletonList`, `SkeletonChart` and `SkeletonWidget` stay
  plain decorative containers. Nested live regions announce more than once, so
  there is exactly one group per loading surface — a test asserts this.
- The decorative SVG in `SkeletonChart` is now `aria-hidden` too.

### Colour contrast

The placeholders are decorative and hidden from assistive technology, so
WCAG 1.4.11 does not apply — it exempts content that is "purely decorative".
They keep the existing low-contrast design rather than being redesigned here.

`--skeleton-static` is set to the shimmer's *highlight* value rather than its
base, so removing the motion does not also make the placeholder fainter than the
animated version's average.

### Keyboard

Nothing in a skeleton is focusable, so there is no keyboard surface and no focus
order to preserve. Tab order is unchanged when a placeholder is swapped for real
content, and no focus trap is possible.

Walkthrough: load any route with a `loading.tsx` (`/dashboard`, `/bills`,
`/insights`, `/goals`, `/dashboard/transaction-history`), tab from the top —
focus moves from the skip link through the nav and straight past the placeholder
region into whatever follows it, with no stops inside the skeleton. When the
real content mounts, the first focusable element in that region enters the tab
order in the position the placeholder occupied.

## Design tokens

New CSS custom properties in `app/globals.css`, documented in
`docs/THEMING.md`: `--skeleton-base`, `--skeleton-highlight`,
`--skeleton-static`, each with a light and a dark value. The previous
hard-coded `from-white/5 via-white/10 to-white/5` literals are gone.

`.rw-skeleton` and `.rw-skeleton--shimmer` are emitted into Tailwind's
`components` layer, so any utility passed via `className` still overrides them.

## Testing

`tests/unit/ui/skeleton.test.tsx` — 14 tests, all passing:

- variant classes, including that `static` omits the shimmer modifier;
- caller `className` and inline `style` are preserved;
- the decorative `aria-hidden`;
- no literal colours in the emitted class list;
- the live region, its `aria-busy`, its label and its `sr-only` treatment;
- exactly one `role="status"` survives nesting;
- a `jest-axe` scan of a rendered group — **zero violations**.

jsdom does not evaluate media queries, so the reduced-motion fallback is covered
by asserting against the rule in `app/globals.css` directly. Without those tests
the shimmer could be un-gated by an unrelated CSS edit and nothing would notice.

Three existing assertions on `.animate-shimmer` in the dashboard and insight
page tests were updated to `.rw-skeleton--shimmer`.

**No regressions.** Stashing the change and re-running the dashboard, bills and
widget suites gives 63 failures before and 63 after — all pre-existing — with 14
more passing after.

`npm run lint` is clean on every file touched here.

## Known gaps

**`npm run build` and a full `tsc --noEmit` do not pass on `main`**, for reasons
unrelated to this issue. Three files are broken by what look like `-X theirs`
merge auto-resolutions:

| File | Error |
| --- | --- |
| `app/settings/page.tsx:77` | TS17002 — unclosed `<h1>` |
| `components/Nav/PrimaryNav.tsx:32` | TS2657 — JSX expressions must have one parent |
| `components/ui/LoadingSkeletons.tsx:244,464` | TS2323/TS2393 — `TransactionHistoryLoadingSkeleton` exported twice, from `c4b1b94` (PR #806) |

None of the three are touched here; deleting 115 lines of another PR's merge
resolution inside an accessibility change is the wrong place for it. To confirm
these edits are sound, `LoadingSkeletons.tsx` was type-checked with the duplicate
temporarily renamed — clean. Filing separately.

As a result **the axe report against a live route is still outstanding**: the app
does not build, and `@axe-core/playwright` is not in `package.json` even though
`tests/e2e/nav-a11y.spec.ts` imports it. The jsdom `jest-axe` scan above is real
but is not the same artifact the acceptance criteria ask for.

Once the build blockers clear, the natural follow-up is a Playwright spec using
`test.use({ reducedMotion: 'reduce' })` with a delayed route intercept to hold
the skeleton on screen long enough to scan.

Screen-reader verification (VoiceOver / NVDA) likewise still needs a running app.

## Follow-ups (not in this PR)

- The duplicate export in `LoadingSkeletons.tsx` and the two JSX syntax errors
  above.
- `app/dashboard/transaction-history/page.tsx` inlines the shimmer by hand on
  ten lines instead of using `<Skeleton />`, so it misses the flat-fill fallback
  and hard-codes `white/5` / `white/10`.
- `SkeletonCard` and `SkeletonChart` call `Math.random()` during render for bar
  heights, which is a hydration mismatch waiting to happen.
- The widget-level call sites (`RecentTransactionsWidget`,
  `MoneyDistributionWidget`, `SavingsByGoalWidget`, `SixMonthTrendsWidget`,
  `app/bills`, `app/insurance`, `app/financial-insights`) render composite
  skeletons standalone and would each benefit from their own `SkeletonGroup`.

## Storybook

- `UI/Skeleton` — `Shimmer`, `Static`, `ShimmerVersusStatic`, `Shapes`
- `UI/SkeletonGroup` — `Default`, `StaticShapes`

As with the existing locale stories, the repository still ships no `.storybook/`
config, so these lint but are not registered in any UI yet.

## Checklist

- [x] Matches the summary in the issue
- [x] `npm run lint` clean on all touched files
- [x] Unit tests pass; no regressions against baseline
- [x] Axe scan with zero violations (jsdom / `jest-axe`)
- [x] Keyboard behaviour described above
- [x] Design tokens respected; no hard-coded colours, spacing or radii
- [x] `docs/COMPONENTS.md` and `docs/THEMING.md` updated
- [x] Storybook stories added for the new prop
- [ ] Axe report from a live route — blocked, see Known gaps
- [ ] Screen-reader pass — blocked, see Known gaps
