"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  /** Dialog title – defaults to "Are you sure?" */
  title?: string;
  /** Descriptive body copy shown below the title */
  description?: string;
  /** Label for the confirm (positive) button – defaults to "Confirm" */
  confirmLabel?: string;
  /** Label for the cancel button – defaults to "Cancel" */
  cancelLabel?: string;
  /**
   * Visual intent of the confirm button.
   * - `"danger"` renders the button in red (irreversible / destructive actions)
   * - `"primary"` renders the button in blue (default)
   */
  intent?: "primary" | "danger";
}

export interface ConfirmState extends Required<ConfirmOptions> {
  isOpen: boolean;
}

interface ConfirmContextValue {
  /** Current dialog state (consumed by {@link ConfirmDialog}) */
  state: ConfirmState;
  /**
   * Open the dialog and return a Promise that resolves to `true` when the user
   * clicks Confirm or `false` when the user clicks Cancel / presses Escape.
   *
   * Drop-in replacement for `window.confirm` without blocking the main thread.
   *
   * @example
   * ```tsx
   * const { confirm } = useConfirm();
   *
   * const handleDelete = async () => {
   *   const ok = await confirm({
   *     title: "Delete account",
   *     description: "This action cannot be undone.",
   *     intent: "danger",
   *     confirmLabel: "Delete",
   *   });
   *   if (ok) deleteMutation.mutate();
   * };
   * ```
   */
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  /** Resolve the current pending Promise as `true` (Confirm clicked) */
  _resolve: (value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<ConfirmOptions> = {
  title: "Are you sure?",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  intent: "primary",
};

const CLOSED_STATE: ConfirmState = {
  ...DEFAULT_OPTIONS,
  isOpen: false,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ConfirmContext = createContext<ConfirmContextValue | undefined>(
  undefined,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>(CLOSED_STATE);

  /**
   * A ref that holds the resolve function of the currently pending Promise so
   * the dialog buttons can settle it without stale closures.
   */
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options?: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title: options?.title ?? DEFAULT_OPTIONS.title,
        description: options?.description ?? DEFAULT_OPTIONS.description,
        confirmLabel: options?.confirmLabel ?? DEFAULT_OPTIONS.confirmLabel,
        cancelLabel: options?.cancelLabel ?? DEFAULT_OPTIONS.cancelLabel,
        intent: options?.intent ?? DEFAULT_OPTIONS.intent,
      });
    });
  }, []);

  const _resolve = useCallback((value: boolean) => {
    setState(CLOSED_STATE);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={{ state, confirm, _resolve }}>
      {children}
    </ConfirmContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * Returns the `confirm` function that opens the custom dialog and resolves to
 * a `boolean`.  Must be called inside a {@link ConfirmProvider}.
 *
 * @example
 * ```tsx
 * const { confirm } = useConfirm();
 * const proceed = await confirm({ title: "Delete?", intent: "danger" });
 * ```
 */
export function useConfirm(): Pick<ConfirmContextValue, "confirm"> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return { confirm: ctx.confirm };
}

/**
 * Internal hook used by {@link ConfirmDialog} to read the current dialog state
 * and settle the pending Promise.  Not intended for application code.
 */
export function useConfirmInternal(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirmInternal must be used within a ConfirmProvider");
  }
  return ctx;
}
