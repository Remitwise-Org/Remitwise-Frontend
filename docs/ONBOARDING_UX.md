# Onboarding UX Decision Matrix

This guide helps contributors decide between an Empty State, Onboarding Flow, or Tutorial for a new feature. We rely on this information internally to verify behaviour against the documented intent. Writing it down lets reviewers verify behaviour against the documented intent, lets new contributors get productive without reading every commit, and lets the support team answer common questions without paging an engineer.

## Decision Matrix

When building a new view or component, use this table to pick the appropriate UX pattern:

| Pattern | When to use | Key characteristic |
|---|---|---|
| **Empty State** | The user has no data yet, but the feature is simple and self-explanatory. | A direct call-to-action (CTA) to create data. |
| **Onboarding Flow** | A complex multi-step setup is required before the user can use the feature. | Blocking, sequential steps (e.g. KYC, configuration). |
| **Tutorial** | The feature is complex, but the user has data or can explore it optionally. | Dismissible, non-blocking guidance (e.g. tooltips, "tour"). |

## Concrete Examples

### 1. Empty State: Bills

When a user navigates to the Bills page (`/bills`) and hasn't added any bills yet, we show an empty state. 

**Example Component Output:**
```tsx
function BillsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">No bills tracked yet</h3>
      <p className="mt-2 text-sm text-slate-500">
        Add your regular expenses to track them automatically.
      </p>
      <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
        Add First Bill
      </button>
    </div>
  );
}
```

### 2. Onboarding Flow: Smart Money Split

The Smart Money Split feature requires a complex setup involving bank connections, allocation percentages, and confirmation. This requires an onboarding flow that blocks the user from proceeding until completed.

**Example Entrypoint:**
When a user visits `/split` for the first time, they are redirected to `/split/onboarding/step-1` to begin the 3-step configuration process.

### 3. Tutorial: Family Wallets

Family Wallets have multiple features (roles, limits, history). Instead of forcing a blocking onboarding, we use a tutorial "tour" when the user visits `/family` for the first time.

**Example Implementation:**
We use a dismissible contextual tooltip to point out the "Set Spending Limit" button, rather than hiding the main dashboard behind a setup screen.

## Related Resources

*   See [component-states.md](component-states.md) for how to style loading and disabled states in our UI.
*   See the main [README.md](../README.md) for project setup and routing information.
