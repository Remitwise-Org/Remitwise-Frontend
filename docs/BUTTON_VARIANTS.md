# Button Variants

This document outlines the semantic usage of button variants in the RemitWise frontend. It is written for **contributors** to ensure consistency across the application when implementing UI features.

By adhering to these semantics, we create a predictable user experience, make our application more accessible, and reduce the need for custom styling in every component.

## Overview

We primarily use four button variants:

1.  **Primary**: For the main action on a page or modal.
2.  **Secondary**: For alternative or supporting actions.
3.  **Danger**: For destructive actions that cannot be easily undone.
4.  **Ghost**: For tertiary actions that should not distract from the primary flow.

All buttons should use Tailwind CSS utility classes and adhere to the colors defined in our `tailwind.config.js`. Avoid hardcoding hex values or raw colors outside of the design tokens.

---

## 1. Primary Button

The **Primary** button represents the most important action on a given screen or within a given context (e.g., submitting a form, confirming a transfer). There should generally be only **one** primary button visible per distinct section or modal.

**Semantic intent:** "This is the main thing you should do here."

### Concrete Example

```tsx
import React from 'react';

export default function SubmitTransferButton() {
  return (
    <button 
      type="submit"
      className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-primary-500"
    >
      Send Money
    </button>
  );
}
```

---

## 2. Secondary Button

The **Secondary** button provides an alternative to the primary action. It is commonly used for "Cancel", "Back", or supplementary actions like "Edit Profile" where a primary action might be "Save Changes".

**Semantic intent:** "Here is an alternative action you can take."

### Concrete Example

```tsx
import React from 'react';

export default function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-slate-300"
    >
      Cancel
    </button>
  );
}
```

---

## 3. Danger Button

The **Danger** button is reserved for destructive actions, such as deleting an account, removing a family member, or canceling an active subscription. These buttons use the `red` palette to signal caution.

**Semantic intent:** "Warning: This action is destructive and potentially irreversible."

### Concrete Example

```tsx
import React from 'react';

export default function DeleteAccountButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button 
      type="button"
      onClick={onDelete}
      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-red-500"
    >
      Delete Account
    </button>
  );
}
```

---

## 4. Ghost Button

The **Ghost** button has no background or border in its default state, appearing only as text (sometimes with an icon). It is used for tertiary actions that are useful but should not compete visually with Primary or Secondary buttons (e.g., "Learn more", "Clear filters", or simple icon buttons).

**Semantic intent:** "This action is available, but it's not the main focus."

### Concrete Example

```tsx
import React from 'react';

export default function ClearFiltersButton({ onClear }: { onClear: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClear}
      className="px-4 py-2 text-sm font-medium text-gray-600 bg-transparent rounded-lg hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-gray-300"
    >
      Clear Filters
    </button>
  );
}
```

---

## Best Practices

- **Focus States:** Always include focus states (`focus:ring-2`, `focus:ring-focus`, `focus:outline-none`) for keyboard accessibility. 
- **Disabled States:** When a button is disabled, visually indicate it using `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Icons:** When adding icons to buttons, use a `flex items-center gap-2` layout for proper alignment.
