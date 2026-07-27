"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { TOAST_TIMEOUT_MS } from "@/lib/config/toast";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface DiagnosticDetails {
  /** Request ID for tracking and support */
  requestId?: string;
  /** Error code for categorization */
  errorCode?: string;
  /** Timestamp when the error occurred */
  timestamp?: string;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Auto-dismiss delay in ms. Pass 0 to require manual dismissal. Default uses config (5000). */
  duration?: number;
  /** Diagnostic details shown in disclosure (error variant only) */
  diagnostics?: DiagnosticDetails;
}

interface ToastContextValue {
  toasts: Toast[];
  history: Toast[];
  toast: (options: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  clearHistory: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [history, setHistory] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const archiveToast = useCallback((toastToArchive: Toast) => {
    setHistory((prev) => {
      if (prev.some((item) => item.id === toastToArchive.id)) {
        return prev;
      }

      const next = [toastToArchive, ...prev];
      return next.slice(0, 10);
    });
  }, []);

  const toast = useCallback((options: Omit<Toast, "id">): string => {
    const id = `toast-${++counterRef.current}`;
    const duration = options.duration ?? (options.action ? 0 : 5000);
    const nextToast = { ...options, id, duration };

    setToasts((prev) => {
      const next = [...prev, nextToast];
      const overflow = next.length > 3 ? next.slice(0, next.length - 3) : [];

      overflow.forEach((item) => archiveToast(item));

      return next.length > 3 ? next.slice(-3) : next;
    });

    return id;
  }, [archiveToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((toastItem) => toastItem.id === id);
      if (target) {
        archiveToast(target);
      }

      return prev.filter((toastItem) => toastItem.id !== id);
    });
  }, [archiveToast]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, history, toast, dismiss, clearHistory }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
