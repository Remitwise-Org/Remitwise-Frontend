"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/lib/context/ToastContext";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  debounceMs?: number;
  toastDuration?: number;
}

export function useAutosave(
  onSave: () => Promise<void>,
  options: UseAutosaveOptions = {},
) {
  const { debounceMs = 500, toastDuration = 2000 } = options;
  const [saveState, setSaveState] = useState<AutosaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onSaveRef = useRef(onSave);
  const { toast } = useToast();

  onSaveRef.current = onSave;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    };
  }, []);

  const executeSave = useCallback(async () => {
    setSaveState("saving");
    try {
      await onSaveRef.current();
      if (mountedRef.current) {
        setSaveState("saved");
        setError(null);
        toast({
          variant: "success",
          title: "settings.preferences_saved_title",
          description: "settings.preferences_saved_description",
          duration: toastDuration,
        });
        returnTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSaveState("idle");
        }, 1200);
      }
    } catch (err) {
      if (mountedRef.current) {
        setSaveState("error");
        const msg = err instanceof Error ? err.message : "Save failed";
        setError(msg);
        toast({
          variant: "error",
          title: "settings.save_error_title",
          duration: toastDuration,
        });
        returnTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSaveState("idle");
        }, 2000);
      }
    }
  }, [toast, toastDuration]);

  const triggerSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsDirty(true);

    timerRef.current = setTimeout(() => {
      void executeSave();
    }, debounceMs);
  }, [debounceMs, executeSave]);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsDirty(false);
    await executeSave();
  }, [executeSave]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    setSaveState("idle");
    setError(null);
    setIsDirty(false);
  }, []);

  return { saveState, error, isDirty, triggerSave, flush, reset };
}
