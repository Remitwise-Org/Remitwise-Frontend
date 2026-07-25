"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";
import { useShortcutHelp } from "@/lib/context/ShortcutHelpContext";
import { useFocusTrap } from "@/src/lib/hooks/useFocusTrap";

export default function ShortcutHelpModal() {
  const { isOpen, close } = useShortcutHelp();

  // Traps focus inside the modal, closes on Escape, prevents background scrolling,
  // and restores focus to the previously active element when closed.
  const modalRef = useFocusTrap({
    isActive: isOpen,
    onEscape: close,
    onOverlayClick: close,
    restoreFocusOnClose: true,
  }) as unknown as React.RefObject<HTMLDivElement>;

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#dc2626]" aria-hidden="true" />
            <h2 id="shortcut-help-title" className="text-lg font-semibold text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Close keyboard shortcuts help modal"
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-3 pt-4">
          <div className="flex justify-between items-center py-2.5 px-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-sm text-gray-300">Open Keyboard Shortcuts</span>
            <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">?</kbd>
          </div>

          <div className="flex justify-between items-center py-2.5 px-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-sm text-gray-300">Toggle Command Palette</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">⌘</kbd>
              <span className="text-gray-500 text-xs">/</span>
              <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">Ctrl</kbd>
              <span className="text-gray-500 text-xs">+</span>
              <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">K</kbd>
            </div>
          </div>

          <div className="flex justify-between items-center py-2.5 px-3 bg-white/[0.02] border border-white/5 rounded-xl">
            <span className="text-sm text-gray-300">Close Open Modal / Dialog</span>
            <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
