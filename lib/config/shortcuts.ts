/**
 * Central keyboard-shortcut registry.
 * Consumed by ShortcutHelpModal, the /shortcuts printable page, and docs.
 */

export type ShortcutCategory = "global" | "navigation" | "modals" | "lists";

export type ShortcutEntry = {
  id: string;
  /** Primary key segments shown on macOS (e.g. ["⌘", "K"] or ["?"]). */
  keys: string[];
  /** Optional Windows/Linux segments when they differ from macOS. */
  keysWin?: string[];
  label: string;
  category: ShortcutCategory;
  /** Short scope note for the printable cheat sheet. */
  scope: string;
  /** When false, omit from the compact in-app help modal. Defaults to true. */
  showInModal?: boolean;
};

export const SHORTCUT_CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  global: "Global",
  navigation: "Navigation",
  modals: "Modals & overlays",
  lists: "Lists & menus",
};

export const KEYBOARD_SHORTCUTS: ShortcutEntry[] = [
  {
    id: "help",
    keys: ["?"],
    label: "Open keyboard shortcuts help",
    category: "global",
    scope: "Global (ignored while typing in inputs)",
  },
  {
    id: "palette",
    keys: ["⌘", "K"],
    keysWin: ["Ctrl", "K"],
    label: "Toggle command palette",
    category: "global",
    scope: "Global",
  },
  {
    id: "escape",
    keys: ["Esc"],
    label: "Close open modal / dialog / drawer",
    category: "modals",
    scope: "When an overlay is open",
  },
  {
    id: "palette-enter",
    keys: ["Enter"],
    label: "Execute selected command",
    category: "navigation",
    scope: "Command palette",
    showInModal: false,
  },
  {
    id: "palette-arrows",
    keys: ["↑ / ↓"],
    label: "Move command selection",
    category: "navigation",
    scope: "Command palette",
    showInModal: false,
  },
  {
    id: "menu-arrows",
    keys: ["↑ / ↓"],
    label: "Move focus between menu items",
    category: "lists",
    scope: "Wallet dropdown & similar menus",
    showInModal: false,
  },
  {
    id: "menu-home-end",
    keys: ["Home / End"],
    label: "Jump to first / last menu item",
    category: "lists",
    scope: "Wallet dropdown",
    showInModal: false,
  },
  {
    id: "activate-enter",
    keys: ["Enter"],
    label: "Activate focused row or control",
    category: "lists",
    scope: "Settings rows and similar controls",
    showInModal: false,
  },
  {
    id: "activate-space",
    keys: ["Space"],
    label: "Toggle disclosure / activate control",
    category: "lists",
    scope: "Toasts and focusable controls",
    showInModal: false,
  },
  {
    id: "tab",
    keys: ["Tab"],
    label: "Cycle focus forward",
    category: "modals",
    scope: "Modals and drawers (focus trap)",
    showInModal: false,
  },
  {
    id: "shift-tab",
    keys: ["⇧", "Tab"],
    keysWin: ["Shift", "Tab"],
    label: "Cycle focus backward",
    category: "modals",
    scope: "Modals and drawers (focus trap)",
    showInModal: false,
  },
];

export const SHORTCUTS_PRINTABLE_PATH = "/shortcuts";

export function getModalShortcuts(): ShortcutEntry[] {
  return KEYBOARD_SHORTCUTS.filter((entry) => entry.showInModal !== false);
}

export function getShortcutsByCategory(): Record<ShortcutCategory, ShortcutEntry[]> {
  return KEYBOARD_SHORTCUTS.reduce(
    (groups, entry) => {
      groups[entry.category].push(entry);
      return groups;
    },
    {
      global: [],
      navigation: [],
      modals: [],
      lists: [],
    } as Record<ShortcutCategory, ShortcutEntry[]>,
  );
}
