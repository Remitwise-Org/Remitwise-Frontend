# UI PR Review Checklist

**Audience:** reviewers evaluating Pull Requests that change user-facing
components, pages, styles, or routing in RemitWise Frontend.

This checklist is the **general** companion to issue-specific review checklists
such as [`docs/PR_REVIEW_CHECKLIST.md`](./PR_REVIEW_CHECKLIST.md) (responsive
audit). Use it every time you review a UI PR; drop in a more specific checklist
when the PR addresses a single feature audit or migration.

Each link in this file points to an existing doc so reviewers can drill in
without the rules being duplicated here. If you find yourself teaching the
same rule twice in different reviews, update this checklist instead of rewriting
the explanation.

## Pre-review setup

Run these commands locally before reading the diff:

```bash
# 1. Sync with main
git fetch origin main
git rebase origin/main

# 2. Install (only when package.json changed)
npm install

# 3. Lint, type-check, and run the unit tests — all three must pass
npm run lint         # ESLint across the project
npm run typecheck    # tsc --noEmit
npm test             # fast unit suite (Vitest + node:test)
```

If the PR touches a feature area with its own test suite (Playwright e2e,
contract cache, etc.) run that suite too:

```bash
npm run test:e2e -- tests/e2e/<feature>.spec.ts   # Playwright
npm run test:integration                            # node:test API suites
```

A PR is **not ready for review** until all three of `lint`, `typecheck`, and
`test` pass on a clean clone.

## Review checklist

### 1. The change matches the PR description

- [ ] The diff implements what the PR description claims — no scope creep.
- [ ] No drive-by refactors, formatting churn, or unrelated renames. Surface
      these as a follow-up issue instead.
- [ ] If the PR references an issue, it uses `Closes #NNN` (or `Fixes #NNN`)
      and the diff matches the issue’s acceptance criteria.

### 2. TypeScript correctness

See [`docs/TYPESCRIPT_CONVENTIONS.md`](./TYPESCRIPT_CONVENTIONS.md) for the
full rules. The most common review catches:

- [ ] **No new `any` or `as unknown as T` casts.** If you hit a type wall,
      reach for `never`-narrow prop design (see `WidgetEmptyState`) or extract
      a proper type instead.
- [ ] **Mutually exclusive props use `never` on the forbidden fields**, e.g.
      `ctaHref?: never` when `onAction` is set. Reviewers should reject
      `<WidgetEmptyState ctaHref="…" onAction={…} />` shapes.
- [ ] **New ambient types live in `types/` or `lib/types/`** with a one-line
      comment explaining why they exist. Inline `declare module 'pkg'` in a
      `.tsx` component is not allowed.
- [ ] **Exhaustive switches end with `const _exhaustive: never = status;`**
      so adding a new variant becomes a compile error until handled.
- [ ] `npm run typecheck` is clean.

Concrete file reference:

```ts
// ✅ components/ui/WidgetEmptyState.tsx
type WidgetEmptyStateWithLink = WidgetEmptyStateBaseProps & {
  ctaLabel: string;
  ctaHref: string;
  onAction?: never; // link mode forbids an action handler
};

type WidgetEmptyStateWithAction = WidgetEmptyStateBaseProps & {
  ctaLabel: string;
  onAction: () => void;
  ctaHref?: never; // action mode forbids an href
};
```

### 3. Design tokens — no hard-coded values

- [ ] **No hex colors, raw spacing values, or raw radii in JSX.** Use Tailwind
      tokens from `tailwind.config.js` (`bg-brand-red`, `gap-space-md`,
      `rounded-md`, …). A `grep` for `#[0-9a-fA-F]{3,8}` in components should
      match theme files only.
- [ ] **Status indicators use semantic tokens**, not raw red/green/yellow:
      `text-status-error-fg`, `bg-status-success-bg`, etc.
- [ ] **Contrast ratios meet WCAG 2.1 AA minimums** (≥ 4.5:1 for body text,
      ≥ 3.0:1 for headings/icons). See
      [`docs/SEMANTIC_TOKENS_AND_CONTRAST.md`](./SEMANTIC_TOKENS_AND_CONTRAST.md)
      and `tests/unit/a11y/wcag-contrast.test.ts`.
- [ ] **If you added a new token**, both layers are in sync:
      - `app/globals.css` (`@media (prefers-color-scheme: dark)` block, when
        the token is themeable).
      - `tailwind.config.js` (`theme.extend.colors / spacing`).
      - And the existing PR template (if any) is updated.

Example — what to reject vs. what to accept:

```tsx
// ❌ — hard-coded color, padding, and radius
<div style={{ backgroundColor: '#2b6cb0', padding: '16px', borderRadius: '8px' }}>
  Content
</div>

// ✅ — design tokens only
<div className="bg-bg2 p-4 rounded-md">
  Content
</div>
```

### 4. Component prop conventions

See [`docs/PROP_CONVENTIONS.md`](./PROP_CONVENTIONS.md). Reviewers should
check:

- [ ] **Interface is named `<ComponentName>Props`** and exported so Storybook
      stories and tests can import the type.
- [ ] **Event handlers use the `on<Action>` prefix** (`onConnect`, `onClose`)
      with `(): void` or `(value: T): void` signatures — never `handleClose`.
- [ ] **Destructuring order matches the interface declaration order**, and
      defaults live in the destructured argument (`copyable = true`), not in
      `if (props.copyable !== undefined)` fallbacks.
- [ ] **Boolean props are positive adjectives** (`pending`, `enabled`,
      `copyable`). Reject `notEnabled`, `isNotPending`, `disableCopy`.
- [ ] **Mutually exclusive modes are a union, not two booleans** —
      `variant: "default" | "notification"`, not `isDefault + isNotification`.
- [ ] **If a public component prop changed**, the matching Storybook story
      (if any) and the entry in [`docs/COMPONENTS.md`](./COMPONENTS.md) are
      updated in the same PR.

Reference: `components/WalletButton.tsx` is the canonical compliant example.

### 5. Component states handled

Every interactive component must handle **all six** states. See
[`docs/COMPONENT_STATES.md`](./COMPONENT_STATES.md):

- [ ] **Default** — resting state uses `bg-black`, `border-white/10`.
- [ ] **Hover** — `hover:border-white/20`, `hover:bg-brand-redHover`, etc.
- [ ] **Focus** — visible focus ring via
      `focus-visible:outline-none focus-visible:ring-focus …`. Never remove
      `outline` without a replacement ring. See
      [`docs/ACCESSIBLE_FOCUS_BASELINE.md`](./ACCESSIBLE_FOCUS_BASELINE.md).
- [ ] **Disabled** — `disabled:opacity-50 disabled:cursor-not-allowed`.
- [ ] **Error** — uses `bg-status-error-soft`, `text-status-error-fg`. Form
      errors flow through `useFormAction` (`lib/hooks/useFormAction.ts`).
- [ ] **Loading** — route-level placeholder via `loading.tsx`), wrapped in
      `<Suspense>` for dynamic imports; inline `Loader2` spinner only on
      submit buttons (see `SubmitButton` pattern in `COMPONENT_STATES.md`).

### 6. Accessibility (a11y)

- [ ] **Touch targets ≥ 44×44 px** on mobile (use the `.touch-target` /
      `.touch-target-wide` utilities added in `app/globals.css`).
- [ ] **Focus indicators visible** — never remove `outline` without a
      `focus-visible:ring-…` replacement.
- [ ] **Color contrast meets WCAG AA** — body text ≥ 4.5:1, large text/icons
      ≥ 3.0:1. Status badges include an icon + text label, not color alone.
- [ ] **aria-live regions** are used for toast notifications, command palette
      status, and any screen-reader-visible async updates. See
      [`docs/ARIA_LIVE_REGIONS.md`](./ARIA_LIVE_REGIONS.md).
- [ ] **Keyboard navigation works end-to-end**. `Esc` closes menus/dialogs;
      `Tab`/`Shift+Tab` order matches the visual order. See
      [`docs/FOCUS_TRAPS.md`](./FOCUS_TRAPS.md) and
      [`docs/KEYBOARD_SHORTCUTS.md`](./KEYBOARD_SHORTCUTS.md).
- [ ] **Reduced motion is respected**. New animations honor
      `prefers-reduced-motion`; see
      [`docs/MOTION.md`](./MOTION.md) and `usePrefersReducedMotion.ts`.

### 7. Internationalization (i18n)

New user-visible strings must be localized. See
[`docs/i18n-string-expansion-handoff.md`](./i18n-string-expansion-handoff.md)
and [`CONTRIBUTING.md`](../CONTRIBUTING.md) → “Adding an i18n Key.”

- [ ] **Every new key is added to `lib/i18n/locales/en.json` AND
      `lib/i18n/locales/es.json`**. If you are not a Spanish speaker, leave a
      `"[ES] <English text>"` placeholder so a translator can follow up.
- [ ] **Components use `t('your.key')`**, not raw JSX strings. In client
      components use `useClientLocale()`; in server components use
      `getTranslator`.
- [ ] **String expansion is allowed** — the build approves keys longer than
      the source string. Confirm you did not regress an existing key.
- [ ] **Pluralization and date formatting** go through the locale-aware helpers
      rather than template strings or `toLocaleDateString` (which produces
      hydration mismatches — see §9).

### 8. Hydration safety

New components run on the server in Next.js App Router. See
[`docs/HYDRATION_MISMATCH.md`](./HYDRATION_MISMATCH.md):

- [ ] **Browser APIs are read inside `useEffect`, not during render.** Patterns
      `window.*`, `document.*`, `localStorage.*`, `sessionStorage.*` outside
      an effect or a `typeof window === "undefined"` guard will fail in SSR.
- [ ] **Charts / canvas components use `dynamic(..., { ssr: false })`** and
      render inside a `<Suspense fallback={<SkeletonChart />}>` boundary.
- [ ] **`useSearchParams()` is wrapped in `<Suspense>`**, otherwise Next.js
      refuses to statically render the route.
- [ ] **`new Date()` / locale-sensitive formatters** are deferred to
      `useEffect` or pinned to UTC; `suppressHydrationWarning` is only used
      when the client value is intentionally the source of truth.

### 9. Loading and Suspense patterns

See [`docs/SUSPENSE.md`](./SUSPENSE.md):

- [ ] **Page-level loading → `loading.tsx`** that exports the matching
      skeleton from `components/ui/Skeleton.tsx`.
- [ ] **Lazy / dynamic client component → `<Suspense>`** with a skeleton
      fallback.
- [ ] **Data fetches with retry / error UI → manual `loading` / `error` /
      `data` state**, not `Suspense` (which has no built-in retry path).
- [ ] **Loading skeletons use semantic classes** (`.rw-skeleton`,
      `.loading-skeleton-card`, …) so downstream themes can override
      `--skeleton-base` / `--skeleton-highlight` without touching components.

### 10. Authenticated requests

For any client-side fetch that needs the session cookie:

- [ ] **Use `authFetch` or `apiClient`, not raw `fetch`.** See
      [`docs/client-api.md`](./client-api.md) for the `401 → refresh → retry
      once` flow and session-expiry surfacing.
- [ ] **Server-side and third-party fetches use `fetchWithTimeout`** from
      `lib/fetch-timeout.ts`. See [`docs/fetch-timeout.md`](./fetch-timeout.md).
- [ ] **Rate-limited endpoints** (`/api/auth/*`, writes) do not retry blindly;
      respect the `Retry-After` header returned with `429`.
- [ ] **Browser requests never call `iron-session`/`SESSION_PASSWORD`
      directly.** Those are server-only secrets. The session is exposed via
      cookies; do not echo session payloads to the client.

### 11. Stable test IDs on primary CTAs

Automated tests (Playwright, Vitest, analytics) hook into primary CTAs
through stable `data-testid` values. See
[`lib/cta-testids.ts`](../lib/cta-testids.ts) and
[`docs/primary-cta-testids.md`](./primary-cta-testids.md):

- [ ] **Primary CTAs use the canonical ids** —
      `ctaTestId={CTA_TEST_IDS.page.billsPrimary}` rather than ad-hoc strings.
- [ ] **Do not derive ids from button text or labels.** Buttons change copy;
      the test id must not.
- [ ] **New primary CTAs are added to `CTA_TEST_IDS`** in both `page` and
      `flow` namespaces with a descriptive key.

```tsx
// ✅ — stable selector for Playwright and analytics
<button data-testid={CTA_TEST_IDS.page.billsPrimary}>Pay bill</button>

// ❌ — selector drifts if copy changes
<button data-testid="pay-bill-cta">Pay bill</button>
```

### 12. Responsive design

Most UI PRs affect at least one breakpoint. See
[`docs/RESPONSIVE_TESTING.md`](./RESPONSIVE_TESTING.md) and
[`docs/RESPONSIVE_BREAKPOINT_GUIDE.md`](./RESPONSIVE_BREAKPOINT_GUIDE.md):

- [ ] **Smoke-test 320 px, 375 px, 768 px, 1024 px, 1440 px** in Chrome
      DevTools.
- [ ] **No horizontal scroll** at any of those widths.
- [ ] **Custom project breakpoints are used** instead of generic `sm:` / `md:`
      when finer control is needed (`375:`, `tablet:`, `laptop:`,
      `desktop:`).
- [ ] **No hard-coded pixel widths on container elements** — prefer
      `max-w-screen-*` or grid/flex.
- [ ] **iOS Safari safe areas** are respected on sticky headers/footers
      (`.safari-safe-top`, `.safari-safe-bottom`).

### 13. Right tests for the right runner

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) → “Two test runners in
`test:unit`” and [`docs/TESTING_STANDARDS.md`](./TESTING_STANDARDS.md):

- [ ] **`.cjs` file? → use `node:test` / `assert`**. Examples:
      `tests/unit/webhooks-verify.test.cjs`,
      `tests/unit/middleware.test.cjs`.
- [ ] **`.ts` / `.tsx` file? → use Vitest** with `vi.mock`, `expect`, etc.
      Examples: `tests/unit/validation/savings-goals.test.ts`,
      `utils/currency.test.ts`.
- [ ] **E2E flow? → use Playwright** under `tests/e2e/` with the canonical CTA
      selectors from `lib/cta-testids.ts`.
- [ ] **Tests live next to the code they cover** OR under `tests/unit/`
      grouped by feature. New Vitest tests must appear in `npm run test:unit`
      (already wired) without manual script edits.
- [ ] **Property tests** (`npm run test:property`) for any pure helper where
      randomized inputs add coverage (validation, currency rounding,
      canonicalisation).

### 14. PR description, commits, and dead code

- [ ] **PR description references the issue**: `Closes #NNN` (or `Fixes #NNN`)
      in the body.
- [ ] **Commit messages follow the repo convention** (see
      [`CONTRIBUTING.md`](../CONTRIBUTING.md)):
      ```
      feat: add recurring remittance schedule UI

      Implements the schedule picker and wires it to POST /api/remittance/recurring.
      Closes #301
      ```
- [ ] **No commented-out code, no `console.log` debug statements, no
      `// TODO` parked in the diff** unless the PR explicitly carries them
      (and then they should be tracked as issues).
- [ ] **No new files in the project root** unless they are documentation;
      everything lives under `app/`, `components/`, `lib/`, `utils/`, `types/`,
      or `docs/`.
- [ ] **`npm run lint` is clean** — in particular, no
      `useEffect` without a dependency array and no `useState(myFn())` instead
      of `useState(() => myFn())` (both are banned — see `CONTRIBUTING.md` PR
      Expectations).

### 15. Documentation updates

If the PR changes public contracts or user-facing behaviour:

- [ ] **Component prop surface change → update [`docs/COMPONENTS.md`](./COMPONENTS.md)**
      and the Storybook story in the same PR.
- [ ] **New route or layout → update [`docs/architecture.md`](./architecture.md)**
      and any relevant guide (routing, focus, responsive).
- [ ] **New environment variable → update `.env.example`** and the matching
      section in [`README.md`](../README.md) and
      [`docs/OPERATIONS.md`](./OPERATIONS.md).
- [ ] **New Storybook story → import it from `.storybook/main.ts`** stories
      glob (or its include pattern).
- [ ] **Deprecations → add an entry to [`docs/DEPRECATIONS.md`](./DEPRECATIONS.md)**
      with a before/after migration example.

## Approval matrix

A PR is mergeable when **all of the following are true**:

- [ ] `npm run lint`, `npm run typecheck` (or `npm run build`), and
      `npm test` pass locally on a clean clone.
- [ ] Every checkbox above that applies to this PR is ticked or annotated
      with a tracked follow-up issue.
- [ ] At least one reviewer (other than the author) has approved.
- [ ] For UI PRs that touch shared components, a CODEOWNERS maintainer has
      approved.
- [ ] No unresolved review comments older than 48 hours.

## Reviewer sign-off

When you finish a review, leave a short comment in the PR with the
following shape so the author knows what you actually checked:

```text
Reviewed against docs/CODE_REVIEW.md.

✓ Pre-review: lint, typecheck, test pass locally.
✓ TypeScript + design tokens look clean.
✓ Touched components/ui/Button.tsx — Storybook story + COMPONENTS.md updated.
⚠️ Flagged: the new toast uses an aria-live="assertive" region where
  "polite" is the convention here (see ARIA_LIVE_REGIONS.md). Suggested fix
  in the inline comment.

Approved with the polite-region change addressed.
```

Use ⚠️ for nits that block merge, · for non-blocking suggestions, and ·
for things you checked but have nothing to add.

## Related documentation

- [`docs/PR_REVIEW_CHECKLIST.md`](./PR_REVIEW_CHECKLIST.md) — issue-specific
  audit checklist (currently the responsive breakpoint audit).
- [`docs/TYPESCRIPT_CONVENTIONS.md`](./TYPESCRIPT_CONVENTIONS.md) — ambient
  types, module augmentation, and `never`-narrow patterns.
- [`docs/PROP_CONVENTIONS.md`](./PROP_CONVENTIONS.md) — component prop naming,
  ordering, and boolean conventions.
- [`docs/COMPONENT_STATES.md`](./COMPONENT_STATES.md) — default / hover /
  focus / disabled / error / loading state patterns.
- [`docs/SEMANTIC_TOKENS_AND_CONTRAST.md`](./SEMANTIC_TOKENS_AND_CONTRAST.md) —
  design tokens and WCAG contrast targets.
- [`docs/HYDRATION_MISMATCH.md`](./HYDRATION_MISMATCH.md) — SSR-safe render
  patterns.
- [`docs/SUSPENSE.md`](./SUSPENSE.md) — route-level loading vs. Suspense vs.
  manual state.
- [`docs/COMPONENT_NAMING.md`](./COMPONENT_NAMING.md) — file and component
  naming rules.
- [`docs/testing.md`](./testing.md) and
  [`docs/TESTING_STANDARDS.md`](./TESTING_STANDARDS.md) — runner choice and
  test recipes.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — branch naming, PR expectations,
  i18n key workflow.
