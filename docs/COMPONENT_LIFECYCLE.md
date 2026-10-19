# Component lifecycle: Figma to production

Audience: contributors adding or changing React components in RemitWise.

Before planning or building a new component, check the [Design System Roadmap](DESIGN_SYSTEM_ROADMAP.md) to ensure it is not already planned or deprecating existing patterns.

This workflow turns a Figma handoff into a token-based, documented, tested,
production component. The existing `Toast` is the concrete example:

- `components/Toast.tsx` — implementation
- `components/Toast.stories.tsx` — story catalogue
- `components/Toast.test.tsx` — tests
- `components/ToastRegion.tsx` — production entrypoint

## 1. Make the Figma handoff a behaviour contract

Use `docs/DESIGN_QA_CHECKLIST.md`. Map the frame to a route and resolve:

- applicable default, hover, focus, active, disabled, loading, empty, error,
  and success states;
- mobile, tablet, and desktop layout, wrapping, and overflow;
- keyboard behaviour, focus order, accessible names, announcements, touch
  targets, and reduced motion;
- existing tokens versus values that genuinely need a new token;
- the page, layout, provider, or feature that will render the component.

For `Toast`, the contract includes four variants, an optional action, an error
details disclosure, pause on hover/focus, responsive entrance animations, and
a dismiss control named "Dismiss notification". These behaviours belong in
stories and tests. Resolve unclear interactions with design before coding;
track follow-ups separately instead of speculatively expanding the public API.

## 2. Translate design values into tokens

Check `docs/THEMING.md`, `tailwind.config.js`, and `app/globals.css` before
copying a value from Figma. JSX normally uses Tailwind tokens; CSS custom
properties are for global values needed outside Tailwind composition.

`Toast` maps variants to semantic status tokens:

```tsx
const VARIANT_STYLES = {
  success: {
    panel: "border-status-success-border bg-status-success-soft",
    icon: "text-status-success-fg",
  },
  error: {
    panel: "border-status-error-border bg-status-error-soft",
    icon: "text-status-error-fg",
  },
};
```

Do not replace these with hard-coded colours, spacing, or radii. If no token
has the required semantic role, add a reusable name under `theme.extend` in
`tailwind.config.js` (or `app/globals.css` for a global CSS variable), document
it in `docs/THEMING.md`, then use it across all relevant states.

## 3. Implement the smallest stable API

Put reusable primitives in `components/ui/` and feature components in
`components/<feature>/`. Keep state in the closest layer that needs it. Prefer
typed props describing intent over props exposing style internals.

`Toast` accepts the application toast model and a dismiss callback. Consumers
choose `variant: "success"`; they do not pass panel classes. `ToastRegion`
provides the production integration:

```tsx
{toasts.map((toast) => (
  <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
))}
```

Verify semantic HTML, keyboard operation, visible focus, screen-reader output,
long content, and responsive behaviour. Component-owned user-visible copy must
follow the i18n process in `CONTRIBUTING.md`. If a public prop changes, update
its stories and `docs/COMPONENTS.md` entry in the same change.

## 4. Capture the contract in Storybook

Keep `ComponentName.stories.tsx` beside the component. Use typed Component
Story Format metadata and realistic RemitWise data:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import Toast from "./Toast";

const meta = {
  title: "Components/Toast",
  component: Toast,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    toast: {
      id: "error-1",
      variant: "error",
      title: "Transfer failed",
      description: "Your account balance is too low.",
      duration: 0,
    },
    onDismiss: () => undefined,
  },
};
```

Add applicable default, variant, interactive, loading/disabled, empty/error,
long-content, and narrow-layout stories. Every Figma state should map to a
named story.

The repository currently has typed story files but no `.storybook/` config,
Storybook packages, or Storybook script. There is no runnable local Storybook
command yet. Stories remain the review catalogue until that infrastructure is
added; do not claim to have run Storybook in a PR until it exists.

## 5. Test behaviour, not the screenshot

Colocate `ComponentName.test.tsx` where that is the existing pattern. Use
Vitest and Testing Library to test observable behaviour:

```tsx
it("dismisses the toast", () => {
  const onDismiss = vi.fn();
  render(<Toast toast={mockToast} onDismiss={onDismiss} />);
  fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
  expect(onDismiss).toHaveBeenCalledWith("test-toast-1");
});
```

Cover state branches, callbacks, keyboard interaction, accessible names and
roles, timers or async work, and long content. Use `jest-axe` where the suite
does. Assert token classes only when a semantic variant is part of the
contract. Run unit tests with `npm test`. Add Playwright coverage only for real
navigation, browser layout, wallet behaviour, or API boundaries a component
test cannot represent.

## 6. Integrate through a production entrypoint

A component is not production-ready in isolation. Wire it through its owning
page, layout, provider, or feature. For `Toast`, the real path is:

```text
app/layout.tsx -> ToastProvider -> ToastRegion -> Toast
```

Exercise the real trigger and production data. Check applicable loading,
failure, empty, permission, and responsive paths. Remove fixtures and debug
controls before review.

## 7. Verify and prepare the PR

From a clean install with required environment variables, run:

```bash
npm run lint
npm run build
npm test
```

The production build performs the project type-check. Run relevant integration
or end-to-end suites when crossing those boundaries; see `docs/testing.md`.

Before review, confirm the implementation matches the named Figma states,
uses documented tokens, has stories and behaviour/accessibility tests, and is
rendered by a real entrypoint. Reflect public prop changes in stories and
`docs/COMPONENTS.md`, report check results accurately, keep the PR scoped, and
include `Closes #964` in its description.
