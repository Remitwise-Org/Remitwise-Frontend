"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { useConfirmInternal } from "@/lib/context/ConfirmContext";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

/**
 * ConfirmDialog
 *
 * Renders the confirm/cancel dialog controlled by {@link ConfirmProvider}.
 * Mount this component once near the root of the app (already done inside
 * `components/Providers.tsx`).
 *
 * The dialog:
 * - Uses a `<dialog>` element with ARIA roles for accessibility
 * - Traps focus while open and restores focus on close
 * - Closes on Escape key press (resolves `false`)
 * - Closes on backdrop click (resolves `false`)
 * - Respects design tokens (primary-600, status-error colours, rounded-2xl)
 * - Supports two button intents: "primary" (blue) and "danger" (red)
 */
export default function ConfirmDialog() {
  const { state, _resolve } = useConfirmInternal();
  const { isOpen, title, description, confirmLabel, cancelLabel, intent } =
    state;

  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const dialogRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: () => _resolve(false),
    initialFocusRef: confirmBtnRef,
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (!isOpen) return null;

  const isDanger = intent === "danger";

  const confirmButtonClass = isDanger
    ? "inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
    : "inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      data-testid="confirm-dialog-backdrop"
      onClick={(e) => {
        // Close only when clicking the backdrop itself, not the dialog panel
        if (e.target === e.currentTarget) {
          _resolve(false);
        }
      }}
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl"
        data-testid="confirm-dialog"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              isDanger
                ? "bg-red-600/20"
                : "bg-primary-600/20"
            }`}
            aria-hidden="true"
          >
            {isDanger ? (
              <AlertTriangle
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
              />
            ) : (
              <HelpCircle
                className="h-5 w-5 text-primary-400"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-white leading-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-description"
                className="mt-2 text-sm text-gray-400 leading-relaxed"
              >
                {description}
              </p>
            )}
          </div>

          {/* Close button (resolves false) */}
          <button
            type="button"
            onClick={() => _resolve(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label="Cancel"
            data-testid="confirm-dialog-close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-row-reverse gap-3">
          {/* Confirm */}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => _resolve(true)}
            className={confirmButtonClass}
            data-testid="confirm-dialog-confirm"
          >
            {confirmLabel}
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={() => _resolve(false)}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50"
            data-testid="confirm-dialog-cancel"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
