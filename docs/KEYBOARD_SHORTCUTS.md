# Keyboard Shortcuts

> **Audience:** Contributors adding, changing, or reviewing keyboard interactions.
> **Goal:** One place to find every keyboard shortcut in the app and understand how to modify or extend them.

## Overview

RemitWise keeps a **central shortcut registry** at `lib/config/shortcuts.ts`. The in-app `?` help modal and the printable cheat sheet at [`/shortcuts`](/shortcuts) both read from that registry so the documented list stays in sync with what users see.

Handlers themselves still live in owning components (`keydown` listeners / `onKeyDown` props). The registry is the user-facing catalogue; this document maps each shortcut to its implementation.

## Printable cheat sheet

Visit **`/shortcuts`** for the full list with a **Print** button. The page uses a screen layout plus a print-only white table so Chrome / Safari print dialogs produce a clean desk-side reference (header, footer, and marketing CTA are hidden via `print:hidden`).

| Surface | Path / trigger | Source of truth |
|---------|----------------|-----------------|
| Printable page | `/shortcuts` | `KEYBOARD_SHORTCUTS` in `lib/config/shortcuts.ts` |
| Quick help modal | `?` key, Help button, footer | `getModalShortcuts()` (subset of the registry) |
| Command palette entry | `Cmd`/`Ctrl`+`K` → “Keyboard Shortcuts” | navigates to `/shortcuts` |

## Shortcut reference

| Key | Scope | Action | Component | File |
|-----|-------|--------|-----------|------|
| `?` | Global (ignored in inputs) | Open keyboard shortcuts help | `ShortcutHelpProvider` | `lib/context/ShortcutHelpContext.tsx` |
| `Cmd` / `Ctrl` + `K` | Global | Toggle command palette | `CommandPalette` | `components/CommandPalette.tsx` |
| `Escape` | Global (when palette open) | Close command palette | `CommandPalette` | `components/CommandPalette.tsx` |
| `Escape` | Global (when panel open) | Close "What's New" panel | `WhatsNewPanel` | `components/Dashboard/WhatsNewPanel.tsx` |
| `Escape` | Global (when drawer open) | Close mobile nav drawer | `MobileNav` | `components/Nav/MobileNav.tsx` |
| `Escape` | Global (when modal open) | Close session-expiry notification | `SessionExpiryNotification` | `components/SessionExpiryNotification.tsx` |
| `Escape` | Global (when modal open) | Close savings-goal modal | `SavingsGoalModal` | `app/dashboard/goals/components/SavingsGoalModal.tsx` |
| `Escape` | Global (when drawer open) | Close family-member detail drawer | `FamilyMemberDetailDrawer` | `app/family/components/FamilyMemberDetailDrawer.tsx` |
| `Escape` | Global (when dropdown open) | Close export-format dropdown | Transactions page | `app/transactions/page.tsx` |
| `Escape` | Component | Close policy-detail dialog | `PolicyDetail` | `components/insurance/PolicyDetail.tsx` |
| `Escape` | Component | Close tooltip | `Tooltip` | `components/Tooltip.tsx` |
| `Escape` | Focus-trap hook | Trigger `onEscape` callback | `useFocusTrap` | `lib/hooks/useFocusTrap.ts`, `src/lib/hooks/useFocusTrap.ts` |
| `ArrowDown` | Command palette | Move selection to next command | `CommandPalette` | `components/CommandPalette.tsx` |
| `ArrowUp` | Command palette | Move selection to previous command | `CommandPalette` | `components/CommandPalette.tsx` |
| `ArrowDown` | Wallet dropdown | Move focus to next menu item | `WalletDropdown` | `components/WalletDropdown.tsx` |
| `ArrowUp` | Wallet dropdown | Move focus to previous menu item | `WalletDropdown` | `components/WalletDropdown.tsx` |
| `Home` | Wallet dropdown | Move focus to first menu item | `WalletDropdown` | `components/WalletDropdown.tsx` |
| `End` | Wallet dropdown | Move focus to last menu item | `WalletDropdown` | `components/WalletDropdown.tsx` |
| `Enter` | Command palette | Execute selected command | `CommandPalette` | `components/CommandPalette.tsx` |
| `Enter` | Settings row | Activate clickable row | `SettingsItem` | `components/SettingsItem.tsx` |
| `Enter` / `Space` | Toast disclosure | Toggle diagnostics section | `Toast` | `components/Toast.tsx` |
| `Tab` | Modal / drawer | Cycle focus forward (focus trap) | `useFocusTrap`, `PolicyDetail`, `WhatsNewPanel`, `FamilyMemberDetailDrawer`, `SavingsGoalModal` | Multiple |
| `Shift` + `Tab` | Modal / drawer | Cycle focus backward (focus trap) | `useFocusTrap`, `PolicyDetail`, `WhatsNewPanel`, `FamilyMemberDetailDrawer`, `SavingsGoalModal` | Multiple |

> **Note:** `Escape` is the most-used shortcut. It is handled independently by each component — there is no shared "close active overlay" mechanism.

## Command palette

The file `components/CommandPalette.tsx` implements a `Cmd`/`Ctrl`+`K` command palette with route navigation and quick actions. It is mounted from `components/Providers.tsx`.

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

### 1. Update the registry (required for UI surfaces)

Edit `lib/config/shortcuts.ts` and add or change a `ShortcutEntry`:

```ts
{
  id: "my-shortcut",
  keys: ["⌘", "S"],
  keysWin: ["Ctrl", "S"],
  label: "Save draft",
  category: "global",
  scope: "Send flow",
  showInModal: true, // omit from ? modal when false
}
```

The printable page picks up every entry. The `?` modal only shows entries where `showInModal !== false`.

### 2. Wire the handler in the owning component

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
4. Update `lib/config/shortcuts.ts` and this document.

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

Registry and printable page coverage lives in:

- `lib/config/shortcuts.test.ts`
- `tests/unit/components/ShortcutsCheatSheet.test.tsx`
- `tests/unit/components/ShortcutHelpModal.test.tsx`

## Future improvements

The following are not yet implemented but have been discussed:

1. **User-configurable keybindings** — allow power users to remap shortcuts via settings UI.
2. **Shared "close active overlay" mechanism** — reduce duplicated `Escape` handlers.

See [docs/uiux-quick-actions-improvements.md](uiux-quick-actions-improvements.md) for the original feature proposal that mentioned keyboard hotkeys.
