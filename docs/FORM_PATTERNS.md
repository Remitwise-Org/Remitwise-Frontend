# Form Design & Validation Patterns

This guide documents the core form design patterns, validation strategies, autosave behaviors, and submit affordance conventions in the RemitWise platform. It is written for **frontend contributors** building interactive forms, money-transfer flows, and preference settings panels.

---

## 1. Inline vs. Blocking Validation

RemitWise employs two distinct validation tiers depending on the user action, security requirements, and feedback velocity.

| Dimension | Inline Validation | Blocking Validation |
|---|---|---|
| **Trigger** | Field `onChange` or `onBlur` events | Form submit event (`onSubmit` / `<form action={...}>`) or API route boundary |
| **User Experience** | Immediate contextual feedback below field | Comprehensive form/server error summary or banner |
| **Primary Use Cases** | Format checking, checksum verification, character counters | Business rules, contract state checks, full payload validation |
| **Hook / Utility** | [`useStellarAddressValidation`](file:///workspaces/Remitwise-Frontend/lib/hooks/useStellarAddressValidation.ts) | [`useFormAction`](file:///workspaces/Remitwise-Frontend/lib/hooks/useFormAction.ts) & Zod schemas |

### 1.1 Inline Validation Pattern

Inline validation provides real-time verification as users type or leave an input field. It should be non-intrusive: avoid showing error states before the user has finished interacting with the field.

#### Concrete Example: Stellar Wallet Address Validation
Used in money-transfer components like [`RecipientAddressInput.tsx`](file:///workspaces/Remitwise-Frontend/app/send/components/RecipientAddressInput.tsx):

```tsx
import React, { useState } from 'react';
import useStellarAddressValidation from '@/lib/hooks/useStellarAddressValidation';

export function RecipientAddressInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const validation = useStellarAddressValidation(value);

  return (
    <div className="grid gap-1.5">
      <label htmlFor="recipient" className="block text-sm font-medium text-gray-300">
        Recipient Stellar Address
      </label>
      <input
        id="recipient"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="G..."
        className={`w-full px-4 py-3 bg-[#0A0A0A] border rounded-lg text-white transition-colors ${
          validation.tone === 'error'
            ? 'border-red-500 focus:ring-red-500'
            : validation.tone === 'success'
            ? 'border-green-500 focus:ring-green-500'
            : 'border-white/10 focus:ring-brand.red'
        }`}
      />
      {/* Real-time contextual feedback */}
      <p
        className={`text-xs ${
          validation.tone === 'error'
            ? 'text-red-400'
            : validation.tone === 'success'
            ? 'text-green-400'
            : 'text-gray-400'
        }`}
      >
        {validation.message}
      </p>
    </div>
  );
}
```

### 1.2 Blocking Validation Pattern

Blocking validation occurs upon form submission. It prevents invalid requests from hitting backend API handlers or Soroban smart contracts, and maps server-side validation error arrays back to the UI.

#### Concrete Example: Server-Bound Form Action Validation
Utilizing [`useFormAction`](file:///workspaces/Remitwise-Frontend/lib/hooks/useFormAction.ts):

```tsx
import { useFormAction } from '@/lib/hooks/useFormAction';

export function NewBillForm() {
  const [state, formAction, isPending] = useFormAction('/api/bills');

  return (
    <form action={formAction} className="space-y-4">
      {/* Top-level error summary banner */}
      {state.error && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-sm text-gray-300">Bill Name</label>
        <input
          type="text"
          name="name"
          disabled={isPending}
          className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-white"
        />
        {/* Field-level blocking validation errors attached to state */}
        {state.validationErrors?.find((e) => e.path === 'name') && (
          <span className="text-xs text-red-400">
            {state.validationErrors.find((e) => e.path === 'name')?.message}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand.red hover:bg-brand.redHover text-white py-3 rounded-lg font-semibold disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Create Bill'}
      </button>
    </form>
  );
}
```

---

## 2. Autosave Pattern

For preference settings, notifications, and wallet profile configuration (e.g. [`PreferencesSection.tsx`](file:///workspaces/Remitwise-Frontend/components/settings/PreferencesSection.tsx)), RemitWise uses an autosave pattern rather than requiring manual "Save Changes" buttons.

### Key Characteristics
1. **Debounced Execution**: Input changes trigger debounced saves (default 500ms delay) to limit API traffic.
2. **Dirty Tracking**: `isDirty` flag tracks unsaved edits.
3. **State Cycle**: States transition deterministically through `idle` → `saving` → `saved` / `error` → `idle`.
4. **Toast Feedback**: Success and error states automatically surface user notifications via `ToastContext`.
5. **Flush / Reset**: Emergency explicit submission (e.g. before page navigation) can trigger `flush()`.

### Concrete Example: Settings Autosave Section

Using the [`useAutosave`](file:///workspaces/Remitwise-Frontend/lib/hooks/useAutosave.ts) hook:

```tsx
import React, { useState } from 'react';
import { useAutosave } from '@/lib/hooks/useAutosave';
import { apiClient } from '@/lib/client/apiClient';

export function UserPreferencesSection({ initialCurrency }: { initialCurrency: string }) {
  const [currency, setCurrency] = useState(initialCurrency);

  const { saveState, isDirty, triggerSave } = useAutosave(async () => {
    await apiClient.request('/api/user/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ defaultCurrency: currency }),
    });
  }, { debounceMs: 500 });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value);
    triggerSave();
  };

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white">Default Currency</label>
        {/* Autosave status indicator */}
        <span className="text-xs text-gray-400">
          {saveState === 'saving' && 'Saving changes...'}
          {saveState === 'saved' && 'Saved'}
          {saveState === 'error' && 'Failed to save'}
          {saveState === 'idle' && isDirty && 'Unsaved changes'}
        </span>
      </div>

      <select
        value={currency}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-black border border-white/10 rounded-lg text-white"
      >
        <option value="USD">USD - US Dollar</option>
        <option value="EUR">EUR - Euro</option>
        <option value="NGN">NGN - Nigerian Naira</option>
      </select>
    </div>
  );
}
```

---

## 3. Submit Affordance & In-Flight Request States

Forms that execute high-value transactions (money sends, insurance policies, bill payments) must provide explicit feedback and prevent accidental multi-submissions.

### 3.1 Button Loading States

When a form submission is in-flight:
1. **Disable Submit Button**: Prevent duplicate submissions or double-spends (`disabled={isPending}`).
2. **Disable Form Inputs**: Prevent users from editing form values mid-flight.
3. **Display Spinner & Action Text**: Replace static text with an animated icon (`Loader2` from `lucide-react`) and active state description (e.g. "Processing...", "Confirming on-chain...").

### 3.2 Concrete Example: Transaction Submit Button

```tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface SubmitAffordanceButtonProps {
  isPending: boolean;
  idleText: string;
  pendingText?: string;
  disabled?: boolean;
}

export function SubmitAffordanceButton({
  isPending,
  idleText,
  pendingText = 'Processing...',
  disabled = false,
}: SubmitAffordanceButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className="flex items-center justify-center w-full px-6 py-3 bg-brand.red hover:bg-brand.redHover text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand.red focus:ring-offset-2 focus:ring-offset-black"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>{pendingText}</span>
        </>
      ) : (
        <span>{idleText}</span>
      )}
    </button>
  );
}
```

---

## Related Documentation

- [Frontend Component States Guide](COMPONENT_STATES.md) — Visual treatments for default, hover, focus, disabled, error, and loading component states.
- [Form Action Hook Guide](use-form-action.md) — In-depth reference for `useFormAction`.
- [Settings Page Architecture](settings-page-structure.md) — Full layout and section breakdown for autosaving settings.
- [Hooks Reference](HOOKS.md) — Comprehensive documentation of custom React hooks.
