# Keyboard Shortcuts

> **Audience:** Contributors adding, changing, or reviewing keyboard interactions.
> **Goal:** One place to find every keyboard shortcut in the app and understand how to modify or extend them.

## Overview

RemitWise does **not** have a centralized keybinding system. Every shortcut is registered via an inline `addEventListener("keydown", ...)` or JSX `onKeyDown` prop inside the owning component. This document enumerates every registered shortcut so reviewers can verify behaviour against documented intent and new contributors know where to look.

## Shortcut reference

| Key | Scope | Action | Component | File |
|-----|-------|--------|-----------|------|
| `Cmd` / `Ctrl` + `K` | Global | Toggle command palette | `CommandPalette` | `components/CommandPalette.tsx:101` |
| `Escape` | Global (when palette open) | Close command palette | `CommandPalette` | `components/CommandPalette.tsx:106` |
| `Escape` | Global (when panel open) | Close "What's New" panel | `WhatsNewPanel` | `components/Dashboard/WhatsNewPanel.tsx:24` |
| `Escape` | Global (when drawer open) | Close mobile nav drawer | `MobileNav` | `components/Nav/MobileNav.tsx:56` |
| `Escape` | Global (when modal open) | Close session-expiry notification | `SessionExpiryNotification` | `components/SessionExpiryNotification.tsx:42` |
| `Escape` | Global (when modal open) | Close savings-goal modal | `SavingsGoalModal` | `app/dashboard/goals/components/SavingsGoalModal.tsx:85` |
| `Escape` | Global (when drawer open) | Close family-member detail drawer | `FamilyMemberDetailDrawer` | `app/family/components/FamilyMemberDetailDrawer.tsx:186` |
| `Escape` | Global (when dropdown open) | Close export-format dropdown | Transactions page | `app/transactions/page.tsx:421` |
| `Escape` | Component | Close policy-detail dialog | `PolicyDetail` | `components/insurance/PolicyDetail.tsx:105` |
| `Escape` | Component | Close tooltip | `Tooltip` | `components/Tooltip.tsx:62` |
| `Escape` | Focus-trap hook | Trigger `onEscape` callback | `useFocusTrap` | `lib/hooks/useFocusTrap.ts:31`, `src/lib/hooks/useFocusTrap.ts:64` |
| `ArrowDown` | Command palette | Move selection to next command | `CommandPalette` | `components/CommandPalette.tsx:111` |
| `ArrowUp` | Command palette | Move selection to previous command | `CommandPalette` | `components/CommandPalette.tsx:115` |
| `ArrowDown` | Wallet dropdown | Move focus to next menu item | `WalletDropdown` | `components/WalletDropdown.tsx:123` |
| `ArrowUp` | Wallet dropdown | Move focus to previous menu item | `WalletDropdown` | `components/WalletDropdown.tsx:126` |
| `Home` | Wallet dropdown | Move focus to first menu item | `WalletDropdown` | `components/WalletDropdown.tsx:129` |
| `End` | Wallet dropdown | Move focus to last menu item | `WalletDropdown` | `components/WalletDropdown.tsx:133` |
| `Enter` | Command palette | Execute selected command | `CommandPalette` | `components/CommandPalette.tsx:120` |
| `Enter` | Settings row | Activate clickable row | `SettingsItem` | `components/SettingsItem.tsx:56,117` |
| `Enter` / `Space` | Toast disclosure | Toggle diagnostics section | `Toast` | `components/Toast.tsx:89` |
| `Tab` | Modal / drawer | Cycle focus forward (focus trap) | `useFocusTrap`, `PolicyDetail`, `WhatsNewPanel`, `FamilyMemberDetailDrawer`, `SavingsGoalModal` | Multiple |
| `Shift` + `Tab` | Modal / drawer | Cycle focus backward (focus trap) | `useFocusTrap`, `PolicyDetail`, `WhatsNewPanel`, `FamilyMemberDetailDrawer`, `SavingsGoalModal` | Multiple |

> **Note:** `Escape` is the most-used shortcut (11 registrations). It is handled independently by each component — there is no shared "close active overlay" mechanism.

## Command palette

The file `components/CommandPalette.tsx` implements a `Cmd`/`Ctrl`+`K` command palette with route navigation and quick actions.

### Current status

The component is **not wired into the app layout**. It imports correctly and type-checks, but no parent renders `<CommandPalette />`. The shortcuts in the table above will not fire until it is mounted. To activate it, add `<CommandPalette />` to `app/layout.tsx` or `components/Providers.tsx`.

### How to add a command

Open `components/CommandPalette.tsx` and add an entry to the `commands` array:

```tsx
{
  id: "my-command",
  label: "My Command",
  description: "What this command does",
  icon: <Zap className="w-4 h-4" />,
  action: () => router.push("/my-route"),
  category: "routes", // or "actions"
}
```

Import the icon from `lucide-react` (already a dependency).

## How to add or change a shortcut

Because there is no central registry, you work in the component that owns the shortcut.

### Adding a new shortcut

1. Locate the component that should own the shortcut.
2. Add a `useEffect` with a `keydown` listener (for global/trapped shortcuts) or an `onKeyDown` prop on the JSX element (for component-scoped shortcuts).
3. Match the existing code style:
   - **Global listener** — used when the shortcut must work even when focus is elsewhere (e.g. `Escape` in `WhatsNewPanel`):
     ```tsx
     useEffect(() => {
       const handler = (e: KeyboardEvent) => {
         if (e.key === "Escape") {
           e.preventDefault();
           onClose();
         }
       };
       document.addEventListener("keydown", handler);
       return () => document.removeEventListener("keydown", handler);
     }, [onClose]);
     ```
   - **Component-scoped** — used when the element is focusable (e.g. `Toast`):
     ```tsx
     <button onKeyDown={(e) => {
       if (e.key === "Enter" || e.key === " ") {
         e.preventDefault();
         toggle();
       }
     }}>
     ```

### Changing an existing shortcut

1. Find the owning component via the file-path column in the reference table above.
2. Change the `e.key` comparison in the handler.
3. If the shortcut conflicts with a browser default (e.g. `Ctrl+S`), call `e.preventDefault()`.
4. Update this document.

### Testing a shortcut

Write a Vitest test that dispatches a `KeyboardEvent` on `document` or on the target element and asserts the expected side-effect:

```tsx
import { render, fireEvent } from "@testing-library/react";

it("closes on Escape", () => {
  const onClose = vi.fn();
  render(<MyModal isOpen onClose={onClose} />);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

## Future improvements

The following are not yet implemented but have been discussed:

1. **Wire `CommandPalette` into the layout** — it exists but is unmounted.
2. **Centralized shortcut registry** — a single config object that all components read from, so contributors can see every shortcut in one file.
3. **User-configurable keybindings** — allow power users to remap shortcuts via settings UI.
4. **Keyboard shortcut cheat-sheet modal** — a `?` overlay showing all active shortcuts, similar to GitHub or VS Code.

See [docs/uiux-quick-actions-improvements.md](uiux-quick-actions-improvements.md) for the original feature proposal that mentioned keyboard hotkeys.
