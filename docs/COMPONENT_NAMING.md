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

### 1.2 Export Name

Export the component using the same PascalCase identifier as the file name. Prefer a **named export** over a default export so the name is visible at every import site and refactoring tools can track it accurately.

```tsx
// ✅ Named export — matches the file name StatCard.tsx
export function StatCard({ title, value, icon }: StatCardProps) { ... }

// ✅ Also acceptable for library-style primitives (e.g. forwardRef wrappers)
export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => { ... }
);

// ❌ Avoid anonymous default exports — they hide the component name in traces
export default function ({ title }: StatCardProps) { ... }
```

---

## 2. Directory Layout

Place components in the directory that matches their scope:

| Scope | Directory | Example |
|---|---|---|
| Reusable UI primitives | `components/ui/` | `components/ui/Skeleton.tsx` |
| Feature-specific components | `components/<Feature>/` | `components/Dashboard/StatCard.tsx` |
| Shared top-level components | `components/` | `components/WalletButton.tsx` |
| Route-local components | `app/<route>/components/` | `app/send/components/RecipientAddressInput.tsx` |

Feature directory names use **PascalCase** (e.g., `Dashboard`, `Bills`, `Insights`). Route directory names use **kebab-case** to match the URL (e.g., `send-money`, `family-wallets`). See [ROUTING_PATTERNS.md](ROUTING_PATTERNS.md) for the full route naming spec.

```
components/
├── ui/                    # Primitives: Skeleton, AddressDisplay, StaleBanner
├── Dashboard/             # Dashboard feature
│   ├── StatCard.tsx
│   ├── StatCard.test.tsx
│   └── StatCard.stories.tsx
├── Bills/                 # Bills feature
│   ├── BillsCard.tsx
│   └── UnpaidBillsSection.tsx
├── Insights/              # Insights/charts feature
│   ├── remittanceTrendChart.tsx
│   └── categoryDonutChart.tsx
└── WalletButton.tsx       # Shared, used in multiple features
```

---

## 3. Props Interface

### 3.1 Interface Name

Always define a TypeScript `interface` for component props. Name it `[ComponentName]Props` and export it so tests, stories, and consuming pages can reference it.

```tsx
// ✅
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

When a component wraps a native element and should accept all standard HTML attributes, extend the appropriate React type rather than forwarding a plain `className`:

```tsx
// ✅ Picks up all <div> attributes including aria-* and data-*
interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  chars?: number;
  copyable?: boolean;
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

// ❌ — not the on-prefix convention
handleDismiss: () => void;
dismissCallback: () => void;
```

### 4.2 Boolean Props

Name boolean props positively (state verbs or adjectives that read naturally when `true`). Default to `false` (or the safe, inactive state) in the destructuring block, not in the component body.

```tsx
// ✅
export interface AddressDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  address: string;
  copyable?: boolean;   // positive name; the feature is on by default
  chars?: number;
}

export const AddressDisplay = React.forwardRef<HTMLDivElement, AddressDisplayProps>(
  ({ address, chars = 6, copyable = true, className, ...props }, ref) => { ... }
);

// ❌ Negative name creates a double-negative when the value is false
noCopy?: boolean;

// ❌ Default set inside the body instead of destructuring
function AddressDisplay(props: AddressDisplayProps) {
  const copyable = props.copyable !== undefined ? props.copyable : true;
}
```

If a component has multiple mutually exclusive modes, use a union `variant` prop instead of multiple booleans:

```tsx
// ✅
variant: "default" | "compact" | "notification";

// ❌ Invalid combination becomes possible
isCompact: boolean;
isNotification: boolean;
```

### 4.3 Data Props

Prefer domain-specific types over `any` or opaque `object`. Name the prop after what it represents.

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
✅ useFormatter         — returns locale-aware formatters
✅ useCopyToClipboard   — clipboard state + copy action
✅ useStellarAddressValidation — real-time Stellar address validation

❌ formatter            — missing the use prefix
❌ UseFormatter         — Pascal case is for components, not hooks
❌ use_formatter        — snake_case is not used in this codebase
```

Place shared hooks in `lib/hooks/`. Place hook files beside the component only when the hook is private to that one component.

```
lib/hooks/
├── useFormatter.ts
├── useCopyToClipboard.ts
└── useStellarAddressValidation.ts
```

---

## 6. Stories

Colocate the Storybook story file beside the component file. Name it `[ComponentName].stories.tsx`.

```
components/Dashboard/StatCard.tsx
components/Dashboard/StatCard.stories.tsx   ✅

// ❌ Not colocated — harder to find and maintain
stories/StatCard.stories.tsx
```

Use the `title` field in the story metadata to mirror the directory structure, and export each Figma state as a named `Story`:

```tsx
// components/Dashboard/StatCard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { StatCard } from "./StatCard";

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
    icon: <SendIcon className="h-5 w-5" />,
    trend: "up",
  },
};

export const TrendingDown: Story = {
  args: { ...Default.args, trend: "down" },
};

export const NoTrend: Story = {
  args: { ...Default.args, trend: "none" },
};
```

Story titles follow the pattern `Components/<Feature>/<ComponentName>` so all stories group consistently in the Storybook sidebar.

> **Note:** The repository currently has story files but no `.storybook/` config. Stories type-check and lint but are not rendered until that infrastructure is added.

---

## 7. Tests

Colocate the test file beside the component or, for feature sub-directories, inside a sibling `__tests__/` folder. Name it `[ComponentName].test.tsx`.

```
components/Dashboard/StatCard.tsx
components/Dashboard/StatCard.test.tsx          ✅

components/Dashboard/__tests__/
  MoneyDistributionWidget.a11y.test.tsx         ✅  (accessibility suite)
```

Use **Vitest** and **Testing Library** for component tests. Name test cases to describe observable behaviour:

```tsx
// components/Dashboard/StatCard.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatCard } from "./StatCard";
import { TrendingUp } from "lucide-react";

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

  it("shows a trending-up indicator when trend is up", () => {
    render(
      <StatCard
        title="Total Sent"
        value="$4,200"
        icon={<TrendingUp aria-hidden />}
        trend="up"
      />
    );
    expect(screen.getByLabelText("Trending up")).toBeInTheDocument();
  });
});
```

Run the full suite before pushing:

```bash
npm run test:coverage
```

---

## 8. Type and Utility Files

Non-component TypeScript files use **camelCase** with a descriptive suffix that indicates their role:

| Role | Suffix | Example |
|---|---|---|
| Pure utility functions | `utils.ts` or descriptive noun | `lib/utils/time-ago.ts` |
| Type definitions | `types.ts` | `lib/types/dashboard.ts` |
| React context | `Context.tsx` | `lib/context/WhatsNewContext.tsx` |
| Configuration constants | `config.ts` | `lib/config/seo.ts` |
| Formatter helpers | `formatters.ts` | `lib/i18n/formatters.ts` |

---

## 9. Naming at a Glance

| Artifact | Convention | Example |
|---|---|---|
| Component file | PascalCase `.tsx` | `WalletButton.tsx` |
| Component export | PascalCase named export | `export function WalletButton(...)` |
| Props interface | `[ComponentName]Props` | `WalletButtonProps` |
| Event handler prop | `on` + verb | `onConnect`, `onDismiss` |
| Boolean prop | Positive adjective/verb | `pending`, `copyable`, `disabled` |
| Custom hook | `use` + camelCase | `useFormatter` |
| Hook file | camelCase `.ts` / `.tsx` | `useCopyToClipboard.ts` |
| Story file | `[ComponentName].stories.tsx` | `StatCard.stories.tsx` |
| Test file | `[ComponentName].test.tsx` | `StatCard.test.tsx` |
| Feature directory | PascalCase | `components/Dashboard/` |
| Route directory | kebab-case | `app/send-money/` |
| Utility file | camelCase | `lib/utils/time-ago.ts` |

---

## Related Documentation

- [COMPONENT_LIFECYCLE.md](COMPONENT_LIFECYCLE.md) — full workflow from Figma through design tokens, stories, tests, and production
- [PROP_CONVENTIONS.md](PROP_CONVENTIONS.md) — prop ordering, boolean defaults, and concrete `WalletButton` example
- [COMPONENTS.md](COMPONENTS.md) — inventory of existing components with usage notes
- [ROUTING_PATTERNS.md](ROUTING_PATTERNS.md) — route directory naming and nested-route conventions
- [THEMING.md](THEMING.md) — CSS custom properties and Tailwind tokens; use these instead of hard-coded values
