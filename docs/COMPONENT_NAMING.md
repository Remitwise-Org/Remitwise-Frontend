# Component Naming Conventions

Audience: **frontend contributors** adding or modifying React components in the RemitWise design system.

This document defines the naming rules for component files, TypeScript interfaces, props, hooks, stories, and tests. Following these conventions keeps the codebase consistent and lets reviewers verify behaviour against documented intent without reading every commit.

For the full contributor workflow (Figma → tokens → stories → tests → production), see [COMPONENT_LIFECYCLE.md](COMPONENT_LIFECYCLE.md). For prop ordering and boolean-prop rules, see [PROP_CONVENTIONS.md](PROP_CONVENTIONS.md).

---

## 1. Component Files

### 1.1 File Name

Name every component file in **PascalCase** and use the `.tsx` extension.

```
✅ components/Dashboard/StatCard.tsx
✅ components/ui/AddressDisplay.tsx
✅ components/WalletButton.tsx

❌ components/stat-card.tsx
❌ components/statCard.tsx
❌ components/Stat_Card.tsx
```

### 1.2 Export Style

Prefer a **named export** so the component name is visible at every import site and refactoring tools can track it accurately. For `forwardRef` wrappers and library-style primitives a named `const` export is also fine.

```tsx
// ✅ Named function export — preferred for most components
export function WalletButton({ address, onConnect, pending = false }: WalletButtonProps) {
  // ...
}

// ✅ Named const export — acceptable for forwardRef wrappers (e.g. AddressDisplay)
export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => {
    // ...
  }
);
AddressDisplay.displayName = "AddressDisplay";

// ⚠️  Default export — only used when a file requires it (e.g. Next.js page files,
//     or where a legacy default export already exists and migration is deferred).
//     Always pair a default export with a named declaration so the component name
//     still appears in stack traces and React DevTools.
export default function StatCard({ title, value, icon }: StatCardProps) {
  // ...
}
```

> **Real examples in this repo:**
> - `components/ui/AddressDisplay.tsx` — `export const AddressDisplay = React.forwardRef(…)` with `.displayName`
> - `components/WalletButton.tsx` — `export function WalletButton(…)`
> - `components/Dashboard/StatCard.tsx` — `export default function StatCard(…)` (legacy default; new feature components should use named exports)

---

## 2. Directory Layout

Place components in the directory that matches their scope:

| Scope | Directory | Example |
|---|---|---|
| Reusable UI primitives | `components/ui/` | `components/ui/Skeleton.tsx` |
| Feature-specific components | `components/<Feature>/` | `components/Dashboard/StatCard.tsx` |
| Shared top-level components | `components/` | `components/WalletButton.tsx` |
| Route-local components | `app/<route>/components/` | `app/send/components/RecipientAddressInput.tsx` |

Feature directory names use **PascalCase** (e.g., `Dashboard`, `Bills`, `Insights`). Route directory names use **kebab-case** to match the URL (e.g., `send`, `financial-insights`). See [ROUTING_PATTERNS.md](ROUTING_PATTERNS.md) for the full route naming spec.

```
components/
├── ui/                        # Primitives: Skeleton, AddressDisplay, StaleBanner
│   ├── AddressDisplay.tsx
│   ├── Skeleton.tsx
│   └── StaleBanner.tsx
├── Dashboard/                 # Dashboard feature
│   ├── StatCard.tsx
│   ├── StatCard.test.tsx
│   └── SixMonthTrendsWidget.tsx
├── Bills/                     # Bills feature
│   ├── BillsCard.tsx
│   └── UnpaidBillsSection.tsx
├── Insights/                  # Charts / analytics
│   ├── remittanceTrendChart.tsx
│   └── categoryDonutChart.tsx
└── WalletButton.tsx           # Shared, used across features

app/
├── send/
│   └── components/            # Route-local only, not reused elsewhere
│       └── RecipientAddressInput.tsx
└── bills/
    └── components/
```

---

## 3. Props Interface

### 3.1 Interface Name

Always define a TypeScript `interface` for component props. Name it `[ComponentName]Props` and export it so tests, stories, and consuming pages can reference it.

```tsx
// ✅ — matches the component file name
export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: TrendDirection;
}

// ❌ Too generic — breaks cross-file discoverability
export interface Props { ... }

// ❌ Hungarian prefix — not used in this codebase
export interface IStatCard { ... }
```

### 3.2 Extending HTML Props

When a component wraps a native element and should accept all standard HTML attributes, extend the appropriate React type. This gives callers access to `aria-*`, `data-*`, `ref`, and all other standard attributes for free.

```tsx
// ✅ Picks up all <div> attributes including aria-* and data-*
// Taken from: components/ui/AddressDisplay.tsx
interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The full Stellar address or other long string. */
  address: string;
  /** Characters shown at each end. Defaults to 6. */
  chars?: number;
  /** Whether the copy-to-clipboard button is rendered. Defaults to true. */
  copyable?: boolean;
}
```

### 3.3 JSDoc on Individual Props

Add a one-line JSDoc comment to props whose purpose is not obvious from the name alone. This surfaces in IDE tooltips and in generated documentation.

```tsx
export interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  /** Primary change/highlight text, e.g. "+$240" or "+18%". */
  detail1?: string;
  /** @deprecated Legacy alias for {@link detail1}. Kept for backward compatibility. */
  percentage?: string;
  /** Trend direction. Drives the icon + accessible label — never color alone. */
  trend?: TrendDirection;
}
```

---

## 4. Prop Names

### 4.1 Event Handlers

Prefix every callback prop with `on` followed by a capitalised action verb. The shape must match standard React conventions.

```tsx
// ✅
onDismiss: () => void;
onChange: (enabled: boolean) => void;
onToggleDropdown?: () => void;
onConnect: () => void;

// ❌ — not the on-prefix convention
handleDismiss: () => void;
dismissCallback: () => void;
```

Real example from `components/WalletButton.tsx`:

```tsx
export interface WalletButtonProps {
  address?: string;
  onConnect: () => void;             // ← required callback
  onToggleDropdown?: () => void;     // ← optional callback
  pending?: boolean;
  disabled?: boolean;
}
```

### 4.2 Boolean Props

Name boolean props positively (state verbs or adjectives that read naturally when `true`). Assign the default value in the destructuring block, not inside the component body.

```tsx
// ✅ — positive names, defaults in destructuring
// Taken from: components/ui/AddressDisplay.tsx
export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => {
    // ...
  }
);

// ❌ Negative name creates a double-negative when the value is false
noCopy?: boolean;

// ❌ Default set inside the body
function MyComp(props: MyProps) {
  const copyable = props.copyable !== undefined ? props.copyable : true; // ← wrong
}
```

If a component has multiple mutually exclusive modes, use a union `variant` prop rather than several booleans. This makes invalid combinations impossible at the type level.

```tsx
// ✅ — only one valid state at a time
variant: "default" | "compact" | "notification";

// ❌ — any combination becomes valid (including both true)
isCompact: boolean;
isNotification: boolean;
```

### 4.3 Data Props

Prefer domain-specific named types over `any` or `object`.

```tsx
// ✅
export interface SavingsGoalCardProps {
  savingsGoal: SavingsGoal;
}

// ❌
export interface SavingsGoalCardProps {
  item: any;
  data: object;
}
```

---

## 5. Hooks

Name custom hooks with the `use` prefix in **camelCase**. The remainder of the name describes what the hook provides or tracks.

```
✅ useFormatter            — returns locale-aware formatters
✅ useCopyToClipboard      — clipboard state + copy action
✅ useStellarAddressValidation — real-time Stellar address validation
✅ useSeo                  — sets <title> and <meta name="description">
✅ useFamilyMemberDetail   — fetches and manages family member state
✅ usePrefersReducedMotion — reads the OS motion preference

❌ formatter               — missing the use prefix
❌ UseFormatter            — PascalCase is for components, not hooks
❌ use_formatter           — snake_case is not used in this codebase
```

Place shared hooks in `lib/hooks/`. A hook that is private to a single component can live beside it, but once a second caller appears move it to `lib/hooks/`.

```
lib/hooks/
├── useSeo.ts
├── useCopyToClipboard.ts
├── useFamilyMemberDetail.ts
├── usePrefersReducedMotion.ts
└── useFormAction.ts
```

Real example — `lib/hooks/useSeo.ts`:

```ts
// lib/hooks/useSeo.ts
import { useEffect } from "react";
import { DEFAULT_SEO } from "../config/seo";

interface SeoProps {
  title?: string;
  description?: string;
}

export function useSeo({
  title = DEFAULT_SEO.title,
  description = DEFAULT_SEO.description,
}: SeoProps = {}) {
  useEffect(() => {
    // Pushes onto a stack so nested route metadata restores correctly on unmount.
    // ...
  }, [title, description]);
}
```

Usage in a page component:

```tsx
// app/dashboard/page.tsx (excerpt)
"use client";
import { useSeo } from "@/lib/hooks/useSeo";

export default function DashboardPage() {
  useSeo({
    title: "Dashboard | RemitWise",
    description: "Overview of your remittances, savings, bills, and insurance.",
  });
  // ...
}
```

---

## 6. Stories

Colocate the Storybook story file beside the component it describes. Name it `[ComponentName].stories.tsx`.

```
components/Dashboard/StatCard.tsx
components/Dashboard/StatCard.stories.tsx   ✅

// ❌ Not colocated — harder to find and maintain
stories/StatCard.stories.tsx
```

Use the `title` field to mirror the directory structure, and export each Figma state as a named `Story`:

```tsx
// components/Dashboard/StatCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TrendingUp } from "lucide-react";
import StatCard from "./StatCard";   // default import matches the export style

const meta = {
  title: "Components/Dashboard/StatCard",
  component: StatCard,
  parameters: { layout: "centered" },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Total Sent",
    value: "$4,200",
    icon: <TrendingUp className="h-5 w-5" aria-hidden />,
    trend: "up",
    detail1: "+$240",
  },
};

export const TrendingDown: Story = {
  args: { ...Default.args, trend: "down", detail1: "-$80" },
};

export const NoTrend: Story = {
  args: { title: "Active Policies", value: "3", icon: <TrendingUp className="h-5 w-5" aria-hidden /> },
};
```

Story titles follow the pattern `Components/<Feature>/<ComponentName>` so all stories group consistently in the Storybook sidebar.

> **Note:** the repository ships typed story files (e.g. `components/Toast.stories.tsx`, `components/ui/Skeleton.stories.tsx`) alongside a `.storybook/` config. Stories type-check and lint. Run `npm run storybook` to start the local preview on port 6006.

---

## 7. Tests

Colocate the test file beside the component. Use a sibling `__tests__/` folder only when a dedicated accessibility suite warrants separation. Name it `[ComponentName].test.tsx`.

```
components/Dashboard/StatCard.tsx
components/Dashboard/StatCard.test.tsx          ✅

components/Dashboard/__tests__/
  MoneyDistributionWidget.a11y.test.tsx         ✅  (accessibility suite)
```

Use **Vitest** and **Testing Library** for component tests. Name test cases to describe observable behaviour, not implementation details.

```tsx
// components/Dashboard/StatCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrendingUp } from "lucide-react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders the title and value", () => {
    render(
      <StatCard
        title="Total Sent"
        value="$4,200"
        icon={<TrendingUp aria-hidden />}
      />
    );
    expect(screen.getByText("Total Sent")).toBeInTheDocument();
    expect(screen.getByText("$4,200")).toBeInTheDocument();
  });

  it("shows an accessible trending-up indicator when trend is up", () => {
    render(
      <StatCard
        title="Total Sent"
        value="$4,200"
        icon={<TrendingUp aria-hidden />}
        trend="up"
        detail1="+$240"
      />
    );
    expect(screen.getByRole("img", { name: "Trending up" })).toBeInTheDocument();
  });
});
```

Run the full suite before pushing:

```bash
npm run test:coverage
```

For the multi-runner breakdown (Vitest vs node:test vs Playwright), see [docs/testing.md](testing.md).

---

## 8. Type and Utility Files

Non-component TypeScript files use **camelCase** with a descriptive suffix that indicates their role:

| Role | Suffix | Example |
|---|---|---|
| Pure utility functions | descriptive noun | `lib/utils/time-ago.ts` |
| Type definitions | `types.ts` | `lib/types/dashboard.ts` |
| React context | `Context.tsx` | `lib/context/WhatsNewContext.tsx` |
| Configuration constants | `config.ts` or `<topic>.ts` | `lib/config/seo.ts` |
| Formatter helpers | `formatters.ts` | `lib/i18n/formatters.ts` |
| Validation helpers | descriptive noun | `lib/validation/savings-goals.ts` |

---

## 9. Naming at a Glance

| Artifact | Convention | Example |
|---|---|---|
| Component file | PascalCase `.tsx` | `WalletButton.tsx` |
| Component export | Named export preferred | `export function WalletButton(…)` |
| Default export | Paired with named declaration | `export default function StatCard(…)` |
| Props interface | `[ComponentName]Props`, exported | `WalletButtonProps` |
| Event handler prop | `on` + PascalCase verb | `onConnect`, `onDismiss` |
| Boolean prop | Positive adjective/verb | `pending`, `copyable`, `disabled` |
| Custom hook | `use` + camelCase noun | `useSeo`, `useFormatter` |
| Hook file | camelCase `.ts` or `.tsx` | `useCopyToClipboard.ts` |
| Story file | `[ComponentName].stories.tsx` | `StatCard.stories.tsx` |
| Test file | `[ComponentName].test.tsx` | `StatCard.test.tsx` |
| Feature directory | PascalCase | `components/Dashboard/` |
| Route directory | kebab-case | `app/financial-insights/` |
| Utility / helper file | camelCase | `lib/utils/time-ago.ts` |
| Context file | PascalCase + `Context.tsx` | `lib/context/ToastContext.tsx` |

---

## 10. Quick Checklist for New Components

Before opening a PR, confirm:

- [ ] File is PascalCase `.tsx` in the right directory tier
- [ ] Export is a named export (or a default export paired with a named declaration)
- [ ] Props interface is named `[ComponentName]Props` and is exported
- [ ] Event handler props start with `on`
- [ ] Boolean defaults are set in the destructuring signature, not the body
- [ ] No hard-coded hex colors, spacing, or radii — only Tailwind tokens or CSS custom properties from `app/globals.css` / `tailwind.config.js`
- [ ] Story file colocated and every Figma state is a named export
- [ ] Test file colocated and tests describe observable behaviour
- [ ] Hook name starts with `use` and lives in `lib/hooks/` if shared
- [ ] `npm run lint && npm run build && npm run test:coverage` all pass

---

## Related Documentation

- [COMPONENT_LIFECYCLE.md](COMPONENT_LIFECYCLE.md) — full workflow from Figma through design tokens, stories, tests, and production
- [PROP_CONVENTIONS.md](PROP_CONVENTIONS.md) — prop ordering, boolean defaults, and a complete `WalletButton` example
- [COMPONENTS.md](COMPONENTS.md) — inventory of existing components with usage notes
- [HOOKS.md](HOOKS.md) — catalogue of shared hooks in `lib/hooks/`
- [ROUTING_PATTERNS.md](ROUTING_PATTERNS.md) — route directory naming and nested-route conventions
- [THEMING.md](THEMING.md) — CSS custom properties and Tailwind tokens; use these instead of hard-coded values
- [COMPONENT_STATES.md](COMPONENT_STATES.md) — default, hover, focus, disabled, error, and loading state patterns
