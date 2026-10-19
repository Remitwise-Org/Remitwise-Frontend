"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ShortcutHelpContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ShortcutHelpContext = createContext<ShortcutHelpContextValue | null>(null);

export function ShortcutHelpProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in inputs, textareas, or content-editable elements, do not trigger the shortcut
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return (
    <ShortcutHelpContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </ShortcutHelpContext.Provider>
  );
}

export function useShortcutHelp() {
  const ctx = useContext(ShortcutHelpContext);
  if (!ctx) {
    throw new Error("useShortcutHelp must be used within a ShortcutHelpProvider");
  }
  return ctx;
}
