# UX Anti-Patterns

> **Audience:** Contributors adding or modifying UI in the RemitWise frontend.
>
> This document lists interaction patterns we **intentionally avoid** in this codebase.
> If a PR introduces one of these patterns, reviewers should flag it and the author should
> reach for the alternative described below.

## Table of Contents

1. [Death by Dialog](#death-by-dialog)
2. [Auto-Focus Into Scrolled Content](#auto-focus-into-scrolled-content)
3. [Disabled Buttons Without Explanation](#disabled-buttons-without-explanation)
4. [Toast Spam](#toast-spam)
5. [Bare Empty States](#bare-empty-states)
6. [Layout Shift on Load](#layout-shift-on-load)
7. [Vanishing Async States](#vanishing-async-states)
8. [Hard-Coded Visual Values](#hard-coded-visual-values)
9. [Destructive Defaults](#destructive-defaults)
10. [Confirmation on Every Action](#confirmation-on-every-action)
11. [Auto-Scroll Reset on Navigation](#auto-scroll-reset-on-navigation)
12. [Invisible Disabled Form State](#invisible-disabled-form-state)

---

## Death by Dialog

**The anti-pattern:** Reaching for a `<Dialog>`, `<Modal>`, or overlay for every piece of secondary
content — settings, details, confirmations, and even inline forms.

**Why we avoid it:** Each dialog forces the user to lose context of the page behind it. Stack
multiple dialogs and the user has to dismiss them one by one, often forgetting what triggered the
chain. This pattern also creates serious accessibility issues: focus trapping, ARIA live-region
overlap, and confusing announcements for screen-reader users.

**What to do instead:**

| When you want to … | Prefer … |
|---|---|
| Show extra detail on a list item | An inline expandable row (`<details>` / a collapsible panel) |
| Edit a single field | Inline edit (click-to-edit with a local text input) |
| Confirm a non-destructive action | An inline undo banner (see [Confirmation on Every Action](#confirmation-on-every-action)) |
| Display a quick status message | A toast (from `components/ui/toast.tsx` — see [docs/toast-pattern.md](toast-pattern.md)) |
| Collect input for a new resource | A dedicated page or a slide-over panel that preserves the underlying scroll position |

**Real codebase example:** Instead of a modal for "Add a savings goal", the
`/goals` page navigates to `/goals/new` — a full-page form that keeps the
goal-creation flow bookmarkable and browser-back-friendly.

```tsx
// ❌ Avoid
<Dialog open={showGoalForm}>
  <GoalForm onSave={…} />
</Dialog>

// ✅ Prefer
<Link href="/goals/new">Add Goal</Link>
```

---

## Auto-Focus Into Scrolled Content

**The anti-pattern:** Using `autoFocus` (or `useEffect` + `.focus()`) on an input that is not
visible in the current viewport, causing the page to scroll unexpectedly.

**Why we avoid it:** The user may be mid-way through reading content or comparing values. An
unexpected scroll yanks their visual context, disorients screen-reader focus order, and can be
particularly jarring on mobile where the virtual keyboard may pop open at the same time.

**What to do instead:**

- Only auto-focus the **first** interactive element of a **fresh** page or section (e.g., the
  search box on an empty filter state).
- Never auto-focus into content that is already scrolled past.
- If you need to draw attention to a field that is off-screen, use an anchor link or a
  programmatic scroll with `scrollIntoView({ behavior: 'smooth', block: 'center' })` and only
  focus **after** the scroll completes.

```tsx
// ❌ Avoid
<input autoFocus name="amount" />

// ✅ Prefer — only auto-focus on a pristine page
{isFirstRender && <input autoFocus name="amount" />}
```

---

## Disabled Buttons Without Explanation

**The anti-pattern:** Rendering a `<button disabled>` — or its Lucide / Tailwind equivalent — with
no visible hint about *why* the action is unavailable.

**Why we avoid it:** A greyed-out button is visually ambiguous: is it loading? Is the form
incomplete? Is the user unauthorised? Users waste time guessing or clicking repeatedly.

**What to do instead:**

- Show a **tooltip** (`title` attribute or a custom tooltip component) on the disabled button
  that explains the condition.  
  *Example:* `title="You need to connect a wallet first"`
- For form-submit buttons, attach the explanation to the **first invalid field** via
  `aria-describedby` rather than disabling the button at all.
- When the action is temporarily blocked (rate-limited, processing), show a **loading spinner**
  inside the button instead of disabling it.

```tsx
// ❌ Avoid
<button disabled>Send</button>

// ✅ Prefer
<button
  disabled={!walletConnected}
  title={walletConnected ? undefined : 'Connect your wallet first'}
>
  Send
</button>
```

See [docs/component-states.md](component-states.md) for the full matrix of button states.

---

## Toast Spam

**The anti-pattern:** Firing a toast notification for every state transition — "Saving…",
"Saved!", "Loading…", "Loaded!", "Deleted!", etc.

**Why we avoid it:** Toasts are for **surprising** or **time-sensitive** information that the user
would not otherwise notice. Saturating the toast stream trains the user to ignore all toasts,
defeating their purpose for the cases that genuinely matter (errors, network recovery, payment
confirmations).

**What to do instead:**

| Event | Toast? |
|---|---|
| Successful form submission (inline) | ❌ No — use inline success state |
| Successful form submission (new page) | ❌ No — the new page is the confirmation |
| Network error | ✅ Yes — the user needs to know |
| Payment received | ✅ Yes — time-sensitive |
| Rate-limit warning | ✅ Yes — explains why next click did nothing |
| Auto-saving indicator | ❌ No — show a subtle "Saved" badge inline |

If you do show a toast, follow the auto-dismiss and stacking rules in
[docs/toast-pattern.md](toast-pattern.md).

```tsx
// ❌ Avoid
toast.success('Goal created successfully!');
router.push('/goals');

// ✅ Prefer — the redirect is the confirmation
router.push('/goals');
// (The target page shows the new goal in the list.)
```

---

## Bare Empty States

**The anti-pattern:** Rendering a blank page, a plain "No data" text node, or a raw `{items.length === 0 && <p>Nothing here</p>}` when a list or dashboard section has no content.

**Why we avoid it:** An empty state is the user's first impression of a feature. A bare message
looks broken, creates uncertainty ("is something loading?"), and misses the opportunity to guide
the user toward their next action.

**What to do instead:**

- Show an **illustration or icon** (from Lucide) that communicates the feature.
- Include a **clear heading** explaining what *would* appear here.
- Add a **call-to-action** button or link that starts the first relevant workflow.
- Use the shared `components/ui/EmptyState.tsx` component.

```tsx
// ❌ Avoid
{goals.length === 0 && <p>No savings goals</p>}

// ✅ Prefer
<EmptyState
  icon={Target}
  title="No savings goals yet"
  description="Create your first goal to start tracking progress."
  action={<Link href="/goals/new">Create Goal</Link>}
/>
```

---

## Layout Shift on Load

**The anti-pattern:** Content jumping down the page after images, fonts, or data-fetching resolve,
forcing the user to re-orient or re-click.

**Why we avoid it:** Cumulative Layout Shift (CLS) is a Core Web Vital metric — high CLS
directly hurts our Lighthouse score and frustrates users, especially on slow connections.

**What to do instead:**

- Always set explicit `width` and `height` on images and icons, or use `next/image` with known
  dimensions.
- Use route-level skeleton screens (from `components/ui/Skeleton.tsx` and
  `components/ui/LoadingSkeletons.tsx`) that match the final layout dimensions.
- For async data that replaces a skeleton, keep the container's `min-height` stable.

```tsx
// ❌ Avoid
<img src={logo.src} alt="RemitWise" />

// ✅ Prefer
<Image src={logo} alt="RemitWise" width={180} height={40} />
```

---

## Vanishing Async States

**The anti-pattern:** Showing a loading spinner and, on completion, immediately replacing it with
the final content — no transition, no handoff.

**Why we avoid it:** An abrupt swap from spinner to content can be disorienting and makes it hard
for the user to track what changed. If the operation fails, an even more jarring swap to an error
block leaves the user wondering what just happened.

**What to do instead:**

- Fade-in new content (or fade-out the skeleton) with a short CSS transition
  (`transition-opacity duration-200` in Tailwind).
- On error, preserve the previous content underneath an inline error banner so the user can still
  see and interact with stale data while retrying.
- Use React's `useTransition` for client-side navigation to keep the existing UI responsive.

```tsx
// ❌ Avoid
{isLoading ? <Spinner /> : <TransactionList items={data} />}

// ✅ Prefer
<div className="relative min-h-[400px]">
  <TransactionList
    className={isLoading ? 'opacity-40 transition-opacity duration-200' : ''}
    items={data ?? []}
  />
  {isLoading && (
    <div className="absolute inset-0 flex items-center justify-center">
      <Spinner />
    </div>
  )}
  {error && (
    <ErrorBanner message={error} onRetry={refetch} />
  )}
</div>
```

---

## Hard-Coded Visual Values

**The anti-pattern:** Writing raw colour hex codes, spacing values, border radii, or font sizes
directly in JSX or CSS without referencing the design-token system.

```tsx
// ❌ Avoid
<div style={{ backgroundColor: '#3B82F6', padding: '16px', borderRadius: '8px' }}>
```

**Why we avoid it:** Hard-coded values defeat theming, make dark-mode impossible without
wholesale overrides, and drift from the design system as tokens evolve.

**What to do instead:**

- Use Tailwind utility classes exclusively for layout and visuals.
- If you need a custom value, add it to `tailwind.config.js` as a new design token rather than
  inlining it.
- Reference CSS custom properties defined in `app/globals.css` for any runtime-dynamic styling.

```tsx
// ✅ Prefer
<div className="bg-primary-500 p-4 rounded-lg">
```

See [docs/tailwind-extensions.md](tailwind-extensions.md) for the list of custom tokens available
in this project, and [docs/THEMING.md](THEMING.md) for the dark-mode contract.

---

## Destructive Defaults

**The anti-pattern:** Making a destructive action (delete, remove, close without saving) the
default or primary button in a confirmation prompt.

**Why we avoid it:** Users click the most prominent button without reading — it's a well-known
HCI finding. If that button is "Delete" or "Leave", the cost of a mis-click is high.

**What to do instead:**

- In a two-button confirmation, the **safe** action (Cancel, Keep, Dismiss) is always the
  primary / emphasised button.
- The destructive action is secondary, muted, or — for high-stakes actions — requires the user to
  type a confirmation string (e.g., "DELETE").

```tsx
// ❌ Avoid — destructive button is primary
<Dialog>
  <Button variant="destructive" onClick={handleDelete}>Delete Goal</Button>
  <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
</Dialog>

// ✅ Prefer — safe action is primary, destructive is secondary
<Dialog>
  <Button variant="primary" onClick={handleCancel}>Keep Goal</Button>
  <Button variant="secondary" onClick={handleDelete}>Delete Goal</Button>
</Dialog>
```

---

## Confirmation on Every Action

**The anti-pattern:** Wrapping every non-trivial mutation in a `ConfirmDialog` — "Are you sure
you want to save?", "Are you sure you want to update?", "Are you sure you want to mark as paid?"

**Why we avoid it:** Confirmation fatigue sets in fast. Users start clicking "OK" reflexively,
defeating the purpose of the dialog for the few actions that genuinely need confirmation.

**What to do instead:**

| Action | Confirmation needed? |
|---|---|
| Save / Update | ❌ No — provide an undo mechanism instead |
| Mark as paid | ❌ No — one-click action |
| Delete a savings goal | ✅ Yes — irreversible |
| Cancel a pending transaction | ✅ Yes — irreversible |
| Close a form with unsaved changes | ✅ Yes — data loss is at stake |
| Dismiss a notification | ❌ No — it's designed to be dismissible |

```tsx
// ❌ Avoid — even save needs confirmation
const handleSave = async () => {
  const confirmed = await confirm('Save changes?');
  if (!confirmed) return;
  // … save logic
};

// ✅ Prefer — show an undo banner after saving
const handleSave = async () => {
  await api.save(data);
  showUndoBanner('Goal updated.', onUndo);
};
```

---

## Auto-Scroll Reset on Navigation

**The anti-pattern:** Programmatically calling `window.scrollTo(0, 0)` or relying on Next.js's
default scroll-to-top on every client-side route transition, even when the user was scrolled
halfway down a long list and tapped a link to open an item.

**Why we avoid it:** If a user is browsing a list of transactions, taps one, reads the detail,
and presses back — they expect to be returned to **the same scroll position** in the list, not
thrown back to the top.

**What to do instead:**

- Rely on the global `ScrollRestoration` component mounted in `app/layout.tsx` (see [`HOOKS.md`](./HOOKS.md#usescrollrestoration)). It saves scroll per URL in `sessionStorage` and restores it on Back/Forward.
- Only call `scrollTo` when entering a genuinely new flow (e.g. a wizard step), not on every route change.
- For filter-only or hash-only updates, use `router.push(..., { scroll: false })` and, when needed, the one-shot `window.__rw_skip_scroll_restore` flag.

```tsx
// ❌ Avoid
useEffect(() => { window.scrollTo(0, 0); }, [route]);

// ✅ Prefer — global ScrollRestoration handles history back/forward.
// Only scroll to top when entering a genuinely new flow.
useEffect(() => {
  if (isNewFlow) window.scrollTo(0, 0);
}, [isNewFlow]);
```

---

## Invisible Disabled Form State

**The anti-pattern:** A form where the Submit button is enabled but clicking it silently does
nothing, or a form where all fields are disabled with no visual cue about *why*.

**Why we avoid it:** Silent failure erodes trust. The user may click repeatedly, try different
input values, or assume the app is broken.

**What to do instead:**

- If a form is read-only (viewing a completed bill), use a clear visual style — muted
  backgrounds on fields, a "View only" badge, or a banner at the top.
- If a field is disabled because of a precondition, show the reason inline as
  helper text or a tooltip on the disabled input.

```tsx
// ❌ Avoid
<input disabled value={amount} />

// ✅ Prefer
<div>
  <label>Amount</label>
  <input disabled value={amount} className="bg-gray-100 cursor-not-allowed" />
  <p className="text-xs text-gray-500 mt-1">
    Amount is fixed once a bill is created.
  </p>
</div>
```

---

## Related Documentation

- [docs/component-states.md](component-states.md) — Standard UI states (default, error, disabled, loading)
- [docs/toast-pattern.md](toast-pattern.md) — Toast notification guidelines
- [docs/tailwind-extensions.md](tailwind-extensions.md) — Custom design tokens
- [docs/THEMING.md](THEMING.md) — Dark mode and theming contract
- [docs/testing.md](testing.md) — How to test UI states
- [CONTRIBUTING.md](../CONTRIBUTING.md) — Contribution guide and PR expectations
