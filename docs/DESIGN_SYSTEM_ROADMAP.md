# Design System Roadmap

**Audience:** contributors looking at upcoming design system components, active deprecations, and target patterns.

This roadmap outlines planned components and active deprecations within the RemitWise design system. By documenting these patterns, reviewers can verify UI work against our strategic design goals, new contributors can avoid building duplicate or legacy patterns, and the support/product teams can understand planned user-facing components.

For the workflow on how to take a component from design to production, see the [Component Lifecycle Guide](COMPONENT_LIFECYCLE.md). For the complete catalogue of current tokens, see the [Theming Token Map](THEMING.md).

---

## Planned Components

The following components are planned for upcoming releases to expand our core design system. When implementing new features that require these patterns, use these specifications instead of rolling custom solutions.

### 1. `QrCodeScanner`
* **Purpose:** Allows users to scan Stellar public keys or invoice/payment URIs directly using their device camera, reducing manual input errors during remittance send flows.
* **Component Path (Target):** `components/ui/QrCodeScanner.tsx`
* **Concrete Integration Example:**
  Integrating the scanner within the recipient address input control (`components/forms/RecipientAddressInput.tsx`):

```tsx
import React from "react";
import QrCodeScanner from "@/components/ui/QrCodeScanner";

interface RecipientAddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RecipientAddressInput({
  value,
  onChange,
}: RecipientAddressInputProps) {
  return (
    <div className="flex flex-col gap-space-sm">
      <label className="text-sm font-medium text-gray-200">
        Recipient Stellar Address
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="G..."
          className="w-full bg-brand-dark border border-gray-800 rounded-md p-space-md pr-12 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="absolute right-2">
          <QrCodeScanner
            onScanSuccess={(scannedAddress) => {
              onChange(scannedAddress);
            }}
            onError={(error) => {
              console.error("Camera scan failure:", error);
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

### 2. `CustomSelect` (Accessible Listbox)
* **Purpose:** A customizable dropdown listbox replacement for the native browser `<select>` element. It aligns with our dark mode theme and custom scroll/elevation guidelines while providing strict adherence to WCAG 2.1 AAA keyboard navigation and focus trapping.
* **Component Path (Target):** `components/ui/CustomSelect.tsx`
* **Concrete Integration Example:**
  Selecting remittance currency inside the send flow:

```tsx
import React, { useState } from "react";
import CustomSelect from "@/components/ui/CustomSelect";

const CURRENCY_OPTIONS = [
  { value: "USDC", label: "USD Coin" },
  { value: "XLM", label: "Stellar Lumens" },
  { value: "EURC", label: "Euro Coin" },
];

export default function RemittanceCurrencySelector() {
  const [currency, setCurrency] = useState("USDC");

  return (
    <div className="w-64">
      <CustomSelect
        options={CURRENCY_OPTIONS}
        value={currency}
        onChange={(val) => setCurrency(val)}
        ariaLabel="Remittance currency selector"
      />
    </div>
  );
}
```

---

## Active Deprecations

The following props, components, and endpoints are deprecated. Do not introduce new usages of these patterns in pull requests. Reviewers should flag these in incoming code.

### 1. `percentage` prop on `StatCard`
* **Status:** Deprecated.
* **Target Removal:** Release `v1.2.0` (Tracked in Issue #842).
* **Replacement:** Use the canonical `detail1` prop, which handles any primary highlight detail (e.g., `+$240` or `+18%`).
* **Migration Example:**

```diff
  <StatCard
    title="Active Goals"
    value="4"
-   percentage="+12%"
+   detail1="+12%"
    icon={<Target />}
  />
```

### 2. `brand.red` and `--accent` Tokens
* **Status:** Deprecated.
* **Target Removal:** Next major release (Tracked in Issue #912).
* **Replacement:** Use `brand.primary` (or the equivalent Tailwind config / CSS variable `var(--brand-primary)`). This ensures conformance with color contrast guidelines under light/dark modes.
* **Migration Example:**

```diff
- <button className="bg-brand-red hover:bg-brand-redHover text-white py-2 px-4 rounded-md">
+ <button className="bg-brand-primary hover:bg-brand-primaryHover text-white py-2 px-4 rounded-md">
```

### 3. Misspelled `qoute` API Endpoint / Wrapper
* **Status:** Deprecated.
* **Target Removal:** Release `v1.1.0`.
* **Replacement:** Use the correctly spelled `/api/remittance/quote` route.
* **Migration Example:**

```diff
- const response = await fetch("/api/remittance/qoute?amount=100");
+ const response = await fetch("/api/remittance/quote?amount=100");
```
