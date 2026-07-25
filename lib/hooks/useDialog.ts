"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  DialogHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  RefAttributes,
  RefObject,
} from "react";

export interface UseDialogOptions {
  initialOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type DialogProps = DialogHTMLAttributes<HTMLDivElement> &
  RefAttributes<HTMLDivElement> & {
    role: "dialog";
    "aria-modal": true;
  };

type TriggerProps = ButtonHTMLAttributes<HTMLButtonElement> &
  RefAttributes<HTMLButtonElement> & {
    type: "button";
    "aria-haspopup": "dialog";
    "aria-expanded": boolean;
  };

export interface UseDialogResult {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  dialogRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  dialogProps: DialogProps;
  triggerProps: TriggerProps;
  getDialogProps: (props?: DialogHTMLAttributes<HTMLDivElement>) => DialogProps;
  getTriggerProps: (props?: ButtonHTMLAttributes<HTMLButtonElement>) => TriggerProps;
}

/**
 * Provides the common interaction contract for dialogs.
 *
 * The element that has focus when `open` is called is remembered and receives
 * focus again after `close` is called. The dialog itself receives initial
 * focus, so consumers should attach `dialogRef` to a focusable dialog root
 * (the returned props provide `tabIndex={-1}`).
 */
export function useDialog(options: UseDialogOptions = {}): UseDialogResult {
  const { initialOpen = false, onOpenChange } = options;
  const [isOpen, setIsOpen] = useState(initialOpen);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(initialOpen);

  const open = useCallback(() => {
    if (isOpen) return;

    const activeElement = document.activeElement;
    previouslyFocusedRef.current =
      activeElement instanceof HTMLElement ? activeElement : null;
    wasOpenRef.current = true;
    setIsOpen(true);
    onOpenChange?.(true);
  }, [isOpen, onOpenChange]);

  const close = useCallback(() => {
    if (!isOpen) return;

    setIsOpen(false);
    onOpenChange?.(false);
  }, [isOpen, onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [close, isOpen, open]);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!wasOpenRef.current) return;

    wasOpenRef.current = false;
    const elementToRestore = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;

    if (elementToRestore && elementToRestore.isConnected) {
      elementToRestore.focus({ preventScroll: true });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen]);

  const getDialogProps = useCallback(
    (props: DialogHTMLAttributes<HTMLDivElement> = {}): DialogProps => {
      const { onKeyDown, ...rest } = props;

      return {
        ...rest,
        ref: dialogRef,
        role: "dialog",
        "aria-modal": true,
        tabIndex: props.tabIndex ?? -1,
        onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => {
          onKeyDown?.(event);
        },
      };
    },
    []
  );

  const getTriggerProps = useCallback(
    (props: ButtonHTMLAttributes<HTMLButtonElement> = {}): TriggerProps => {
      const { onClick, ...rest } = props;

      return {
        ...rest,
        ref: triggerRef,
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": isOpen,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) open();
        },
      };
    },
    [isOpen, open]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    dialogRef,
    triggerRef,
    dialogProps: getDialogProps(),
    triggerProps: getTriggerProps(),
    getDialogProps,
    getTriggerProps,
  };
}

export default useDialog;
