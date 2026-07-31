# Component Testing Guide

> **Audience:** Contributors adding or modifying React components.
> For the full multi-runner reference (Vitest vs. node:test vs. Playwright), see
> [docs/testing.md](testing.md). For general standards and the testing pyramid, see
> [docs/TESTING_STANDARDS.md](TESTING_STANDARDS.md).

---

## Table of Contents

1. [Toolchain at a glance](#toolchain-at-a-glance)
2. [Where tests live](#where-tests-live)
3. [Writing your first component test](#writing-your-first-component-test)
4. [Rendering with providers](#rendering-with-providers)
5. [Querying the DOM](#querying-the-dom)
6. [Simulating user interaction](#simulating-user-interaction)
7. [Testing hooks](#testing-hooks)
8. [Async behaviour](#async-behaviour)
9. [i18n in tests](#i18n-in-tests)
10. [Mocking context and external modules](#mocking-context-and-external-modules)
11. [Accessibility assertions](#accessibility-assertions)
12. [What not to test](#what-not-to-test)
13. [Common mistakes](#common-mistakes)
14. [Running component tests](#running-component-tests)

---

## Toolchain at a glance

| Tool | Role |
| --- | --- |
| **Vitest** | Test runner and `expect` assertions |
| **@testing-library/react** | `render`, `renderHook`, `screen`, `within` |
| **@testing-library/user-event** | Realistic pointer/keyboard simulation |
| **@testing-library/jest-dom** | Extra matchers: `toBeInTheDocument`, `toHaveTextContent`, etc. |
| **jsdom** | Browser-like DOM environment (configured in `vitest.config.mjs`) |

`@testing-library/jest-dom` matchers are loaded globally by `vitest.setup.ts` — no import required.

---

## Where tests live

Component tests can live in two places:

| Location | When to use |
| --- | --- |
| **Co-located** — `components/Foo/Foo.test.tsx` | Tightly coupled tests for a single component |
| **`tests/unit/components/`** | Tests that span multiple components or need shared fixtures |

The Vitest glob `components/**/*.test.tsx` picks up co-located tests automatically.

Example structure:
```
components/
  Dashboard/
    DashboardHeader.tsx
    DashboardHeader.test.tsx   ← co-located
  QuickRefreshButton.tsx

tests/unit/components/
  QuickRefreshButton.test.tsx  ← in unit tree (also picked up)
```

---

## Writing your first component test

Here is the minimal template for a Vitest component test:

```tsx
// components/Foo/Foo.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Foo from "./Foo";

describe("Foo", () => {
  it("renders the label", () => {
    render(<Foo label="Hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

A real example from the codebase — `components/QuickRefreshButton.tsx`:

```tsx
// tests/unit/components/QuickRefreshButton.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const refetchQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ refetchQueries }),
}));

vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({
    t: (key: string) => {
      if (key === "quickRefresh.label") return "Quick Refresh";
      if (key === "quickRefresh.button") return "Refresh";
      return key;
    },
  }),
}));

import QuickRefreshButton from "@/components/QuickRefreshButton";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("QuickRefreshButton", () => {
  it("renders the refresh button", () => {
    render(<QuickRefreshButton />);
    expect(screen.getByRole("button", { name: "Quick Refresh" })).toBeInTheDocument();
  });

  it("triggers refetch on click", async () => {
    render(<QuickRefreshButton />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Quick Refresh" }));
    expect(refetchQueries).toHaveBeenCalledWith({ type: "active" });
  });
});
```

Key points:
- Mock external dependencies (`react-query`, `i18n`) at the top using `vi.mock`.
- Call `cleanup()` in `afterEach` to unmount components between tests.
- Call `vi.clearAllMocks()` to reset call counts between tests.

---

## Rendering with providers

Many components need React context providers. The repo has a thin helper at
`tests/react/renderWithProviders.tsx`:

```tsx
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import StatCard from "@/components/Dashboard/StatCard";

it("renders a stat card", () => {
  renderWithProviders(<StatCard title="Total Sent" value="$1,200" icon={null} />);
  expect(screen.getByText("Total Sent")).toBeInTheDocument();
});
```

When you only need a single context, wrap inline:

```tsx
import { ToastProvider } from "@/lib/context/ToastContext";

render(
  <ToastProvider>
    <MyComponent />
  </ToastProvider>
);
```

Prefer `renderWithProviders` for components that depend on multiple contexts (Theme,
Density, Toast) to avoid verbose nesting.

---

## Querying the DOM

Always prefer **accessible queries** — they match what screen readers and assistive
technology expose to users:

| Priority | Query | Example |
| --- | --- | --- |
| 1st | `getByRole` | `screen.getByRole("button", { name: "Send" })` |
| 2nd | `getByLabelText` | `screen.getByLabelText("Amount")` |
| 3rd | `getByPlaceholderText` | `screen.getByPlaceholderText("0.00")` |
| 4th | `getByText` | `screen.getByText("No results")` |
| Last resort | `getByTestId` | `screen.getByTestId("stat-card-value")` |

Avoid `getByTestId` unless no semantic query fits — it couples tests to implementation
details. When you do need one, use the existing `data-testid` conventions from
[docs/primary-cta-testids.md](primary-cta-testids.md).

**`within` for scoped queries:**

When a page has multiple similar elements, scope your query to the relevant container:

```tsx
const card = screen.getByRole("article", { name: "Savings Goals" });
expect(within(card).getByText("$5,000")).toBeInTheDocument();
```

---

## Simulating user interaction

Always use `@testing-library/user-event` instead of `fireEvent`. It simulates real
browser behaviour (focus, pointer events, keyboard sequence):

```tsx
import userEvent from "@testing-library/user-event";

it("opens the dropdown on click", async () => {
  const user = userEvent.setup();
  render(<WalletDropdown />);

  await user.click(screen.getByRole("button", { name: "Wallet" }));

  expect(screen.getByRole("menu")).toBeVisible();
});

it("closes on Escape", async () => {
  const user = userEvent.setup();
  render(<WalletDropdown />);

  await user.click(screen.getByRole("button", { name: "Wallet" }));
  await user.keyboard("{Escape}");

  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
```

Create **one `userEvent.setup()` instance per test** — not per action — so the internal
pointer/keyboard state is consistent across chained interactions.

---

## Testing hooks

Use `renderHook` from `@testing-library/react` for custom hooks:

```tsx
import { renderHook, act } from "@testing-library/react";
import { useTitle } from "@/lib/hooks/useTitle";

it("sets document.title", () => {
  renderHook(() => useTitle("Dashboard"));
  expect(document.title).toBe("Dashboard");
});

it("clears the title on unmount", () => {
  const { unmount } = renderHook(() => useTitle("Dashboard"));
  unmount();
  expect(document.title).toBe("");
});
```

Use `act` when a hook triggers state updates from outside React (e.g. a timer firing):

```tsx
it("marks stale after timeout", async () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useStaleFetch({ url: "/api/data", cacheKey: "x" }));
  act(() => vi.advanceTimersByTime(60_000));
  expect(result.current.isStale).toBe(true);
  vi.useRealTimers();
});
```

---

## Async behaviour

Use `waitFor` when you need to wait for DOM updates triggered by async operations:

```tsx
import { waitFor } from "@testing-library/react";

it("shows the error message after a failed fetch", async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

  render(<DashboardPage />);

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
```

Prefer `findBy*` queries (which internally use `waitFor`) for simple "element appears"
assertions:

```tsx
expect(await screen.findByRole("alert")).toHaveTextContent("Session expired");
```

---

## i18n in tests

The `useClientTranslator` hook reads from the i18n context. In unit tests, mock it with
a simple key-pass-through:

```tsx
vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({
    t: (key: string) => key, // returns the key as-is
  }),
}));
```

Then assert on the translation key rather than the human-readable string:

```tsx
expect(screen.getByText("quickRefresh.button")).toBeInTheDocument();
```

If your test needs the real translated string, supply a dictionary:

```tsx
const dict: Record<string, string> = {
  "quickRefresh.label": "Quick Refresh",
  "quickRefresh.button": "Refresh",
};

vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({ t: (key: string) => dict[key] ?? key }),
}));
```

---

## Mocking context and external modules

### React context

Wrap the component under test in the real provider with controlled initial state:

```tsx
import { ToastProvider } from "@/lib/context/ToastContext";

render(
  <ToastProvider>
    <ComponentThatToasts />
  </ToastProvider>
);
```

### External modules (React Query, router, etc.)

Use `vi.mock` at the top of the file, before any imports that trigger the module:

```tsx
const mockRefetchQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ refetchQueries: mockRefetchQueries }),
}));
```

### Next.js router

```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
```

Always call `vi.clearAllMocks()` (or `vi.resetAllMocks()`) in `afterEach` to prevent
call-count bleed between tests.

---

## Accessibility assertions

Every interactive component should include at least one accessibility assertion.

**Role + accessible name:**
```tsx
// Verify the button has an accessible name (visible text or aria-label)
expect(screen.getByRole("button", { name: "Quick Refresh" })).toBeInTheDocument();
```

**`aria-label` on icon-only buttons:**
```tsx
render(<IconButton aria-label="Close" icon={<X />} />);
expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
```

**ARIA state after interaction:**
```tsx
const trigger = screen.getByRole("button", { name: "Open menu" });
expect(trigger).toHaveAttribute("aria-expanded", "false");
await user.click(trigger);
expect(trigger).toHaveAttribute("aria-expanded", "true");
```

For deeper automated a11y checks, use `jest-axe` in a dedicated test:

```tsx
import { axe } from "jest-axe";

it("has no a11y violations", async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

See `components/__tests__/Tooltip.a11y.test.tsx` for a real axe usage example.

---

## What not to test

Avoid testing implementation details — these lead to brittle tests that break on
refactors without catching real bugs:

| Avoid | Why |
| --- | --- |
| CSS class names (`.bg-brand-red`) | Styling is presentational, not behavioural |
| Internal state variable names | Refactoring state shape should not break tests |
| Component structure / nesting depth | Test what the user sees, not how it is built |
| Prop forwarding for its own sake | The rendered output is the contract |

Do test:
- What text and roles are visible to the user
- What happens when the user interacts (clicks, types, navigates)
- What the component does when data changes or errors occur
- Accessible names, ARIA attributes, and keyboard behaviour

---

## Common mistakes

**1. Forgetting `await` on user interactions**

`userEvent` methods return Promises. Forgetting `await` causes assertions to run before
the DOM updates.

```tsx
// ❌ Wrong — assertion may run before click settles
user.click(button);
expect(screen.getByRole("menu")).toBeVisible();

// ✅ Correct
await user.click(button);
expect(screen.getByRole("menu")).toBeVisible();
```

**2. Not calling `cleanup()` when managing it manually**

`@testing-library/react` registers an automatic `afterEach` cleanup when imported, but
if you override `afterEach` you must call `cleanup()` yourself:

```tsx
afterEach(() => {
  cleanup();         // ← required when you override afterEach
  vi.clearAllMocks();
});
```

**3. Using `getBy*` for elements that may not be present**

Use `queryBy*` when the element might not exist, so the assertion doesn't throw:

```tsx
expect(screen.queryByRole("alert")).not.toBeInTheDocument();
```

**4. Creating `userEvent.setup()` inside a helper that is called per action**

This resets pointer state mid-test. Create the instance once per test:

```tsx
// ❌ Wrong
async function click(el: HTMLElement) {
  await userEvent.setup().click(el); // new instance each call
}

// ✅ Correct
const user = userEvent.setup();
await user.click(buttonA);
await user.keyboard("{Tab}");
await user.click(buttonB);
```

---

## Running component tests

```bash
# Run all component and unit tests (Vitest)
npm run test:unit:vitest

# Run a single test file
node node_modules/vitest/vitest.mjs run --config vitest.config.mjs --configLoader runner \
  tests/unit/components/QuickRefreshButton.test.tsx

# Run in watch mode during development
npm run test:watch

# Full suite with coverage report
npm run test:coverage
```

See [docs/testing.md](testing.md) for the complete script reference and runner decision matrix.
