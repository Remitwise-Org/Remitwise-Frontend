import { describe, it, expect } from "vitest";
import {
  KEYBOARD_SHORTCUTS,
  SHORTCUTS_PRINTABLE_PATH,
  getModalShortcuts,
  getShortcutsByCategory,
} from "@/lib/config/shortcuts";

describe("shortcuts registry", () => {
  it("exports a non-empty shortcut list", () => {
    expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThan(0);
  });

  it("keeps printable path stable", () => {
    expect(SHORTCUTS_PRINTABLE_PATH).toBe("/shortcuts");
  });

  it("exposes core help shortcuts in the modal subset", () => {
    const modalIds = getModalShortcuts().map((entry) => entry.id);
    expect(modalIds).toEqual(expect.arrayContaining(["help", "palette", "escape"]));
    expect(modalIds).not.toContain("palette-arrows");
  });

  it("groups every registry entry into a category bucket", () => {
    const grouped = getShortcutsByCategory();
    const total = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(KEYBOARD_SHORTCUTS.length);
  });

  it("requires id, label, keys, category, and scope on every entry", () => {
    for (const entry of KEYBOARD_SHORTCUTS) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.keys.length).toBeGreaterThan(0);
      expect(entry.category).toBeTruthy();
      expect(entry.scope).toBeTruthy();
    }
  });
});
