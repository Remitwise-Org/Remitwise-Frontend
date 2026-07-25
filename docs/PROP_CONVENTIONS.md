# Component Prop Conventions

Audience: **Frontend Contributors**

This guide defines the conventions for naming, ordering, and defining boolean-props for React components in the RemitWise platform. By adhering to these guidelines, we ensure that the codebase remains consistent, predictable, readable, and easy to maintain.

---

## 1. Prop Naming Conventions

All component properties must follow consistent casing, prefixes, and semantic definitions.

### 1.1 Interface / Type Name
- Always define a dedicated TypeScript interface or type for component properties.
- Name it using the pattern `[ComponentName]Props`.
- Export the type/interface so it can be referenced in tests, page components, or Storybook.

```typescript
// Correct
export interface ToggleProps { ... }

// Incorrect
export interface Props { ... }
export interface IToggle { ... }
```

### 1.2 Event Handlers and Callbacks
- Event handler callback props must be prefixed with `on` followed by the action name in camelCase (e.g., `onChange`, `onClick`, `onSelect`).
- Standardize callback signatures. They should receive values or `void`, matching the standard React event signatures.

```typescript
// Correct
onChange: (enabled: boolean) => void;
onClose: () => void;

// Incorrect
changeHandler: (e: boolean) => void;
handleClose: () => void;
```

### 1.3 DOM and ARIA Properties
- When exposing React wrappers around DOM properties or accessibility (ARIA) tags, use standard camelCase naming in the interface to align with standard React properties.
- Expose specific properties (e.g., `id`, `ariaLabel`, `ariaLabelledBy`) and map them directly to standard HTML elements inside the component.

```typescript
// Interface
interface ToggleProps {
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

// Inside Component JSX
<button
  id={id}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledBy}
>
```

### 1.4 Clear Semantic Naming
- Prefer descriptive domain-specific names rather than generic names.
- Avoid abstract placeholders like `foo` or `data` if the structure is known.

```typescript
// Correct
export interface SavingsGoalCardProps {
  savingsGoal: SavingsGoal;
}

// Incorrect
export interface SavingsGoalCardProps {
  item: any;
}
```

---

## 2. Prop Ordering Conventions

To make interfaces and component function signatures easy to scan, properties should be declared and destructured in a structured, standard order.

### 2.1 Interface Declaration Order
Order properties from most specific/required to generic/optional/styling overrides:

1. **Primary/Core Data & Children**: The most critical data props that the component needs to render. Place `children` or primary data models here.
2. **Callbacks / Event Handlers**: Input actions prefixed with `on` (e.g., `onChange`).
3. **Behavioral Config / Options**: Properties that alter the behavior of the component (e.g., `delay`, `variant`, `chars`).
4. **Style / Class Names**: Properties that customize the visual style or accept extra classes (`className`).
5. **Accessibility / Identity**: ARIA and HTML identifier props (`id`, `ariaLabel`).
6. **Boolean States / Flags**: Conditional modifiers (e.g., `disabled`, `pending`, `success`).

### 2.2 Destructuring Order
The function argument destructuring must mirror the order declared in the interface, and default values should be assigned directly within the destructuring block.

```typescript
// Concrete Example matching ToggleProps
export default function Toggle({
  enabled,
  onChange,
  variant = "default",
  id,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
}: ToggleProps) { ... }
```

---

## 3. Boolean Prop Conventions

Boolean properties require careful design to avoid ambiguity, double-negatives, or confusing logic.

### 3.1 Use Positive Naming
- Name boolean props positively (as adjectives or state verbs) to represent an active or true state.
- Avoid negative names like `noBorder`, `notDisabled`, or `isNotActive`.

```typescript
// Correct
enabled: boolean;
copyable: boolean;
pending: boolean;

// Incorrect
notEnabled: boolean;
disableCopy: boolean;
isNotPending: boolean;
```

### 3.2 Explicit Defaults
- Define default values in the destructured function parameters rather than using inline fallback checks (like `props.disabled ?? false` or `const isDisabled = disabled || false`) in the component body.
- By default, flag modifiers should default to `false` (or a positive option's default) so that omitting the prop resolves to a safe default state.

```typescript
// Correct
export function AddressDisplay({
  address,
  copyable = true,
}: AddressDisplayProps) { ... }

// Incorrect
export function AddressDisplay(props: AddressDisplayProps) {
  const copyable = props.copyable !== undefined ? props.copyable : true;
}
```

### 3.3 Avoid Boolean Bloat
- If a component has multiple mutually exclusive states, do not use multiple boolean flags. Instead, use a union type variant.
- This prevents invalid states (e.g., a component being both `isSuccess` and `isError` at the same time).

```typescript
// Correct
variant: "default" | "notification";

// Incorrect
isDefault: boolean;
isNotification: boolean;
```

---

## 4. Concrete Example

Here is a fully compliant example of a `WalletButton` component showing naming, ordering, boolean default conventions, and Tailwind style token integration.

### Component Implementation (`components/WalletButton.tsx`)

```tsx
"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WalletButtonProps {
  /** The Stellar public key or address of the wallet */
  address?: string;
  /** Callback triggered when a wallet connection is requested */
  onConnect: () => void;
  /** Callback triggered when the wallet dropdown is toggled or opened */
  onToggleDropdown?: () => void;
  /** Additional custom Tailwind styling classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** True if a connection operation is currently in flight */
  pending?: boolean;
  /** True if the wallet interaction is disabled */
  disabled?: boolean;
}

export function WalletButton({
  address,
  onConnect,
  onToggleDropdown,
  className = "",
  ariaLabel,
  pending = false,
  disabled = false,
}: WalletButtonProps) {
  // If an address is provided, it is connected
  const isConnected = !!address;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled || pending) return;

    if (isConnected && onToggleDropdown) {
      onToggleDropdown();
    } else {
      onConnect();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      aria-label={ariaLabel || (isConnected ? "Manage Wallet" : "Connect Wallet")}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center gap-space-sm h-11 px-space-md rounded-lg text-sm font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand-red/40 focus-visible:ring-offset-focus focus-visible:ring-offset-black",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isConnected
          ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
          : "bg-brand-red hover:bg-brand-redHover text-white shadow-lg shadow-brand-red/10",
        className
      )}
    >
      <Wallet className={cn("h-4 w-4", pending && "animate-spin")} />
      <span>
        {pending
          ? "Connecting..."
          : isConnected
          ? `${address.slice(0, 4)}...${address.slice(-4)}`
          : "Connect Wallet"}
      </span>
    </button>
  );
}
```

---

## Related Documentation

For related design specifications and state guidelines, see:
- [Frontend Component States Guide](COMPONENT_STATES.md) — Visual rules for handling default, hover, focus, disabled, error, and loading states.
- [Theming Token Map](file:///c:/Users/TOSHIBA/Remitwise-Frontend/docs/THEMING.md) — Description of the styling variables and breakpoints.
- [Components Inventory](file:///c:/Users/TOSHIBA/Remitwise-Frontend/docs/COMPONENTS.md) — Index of existing layout and formatting components.
