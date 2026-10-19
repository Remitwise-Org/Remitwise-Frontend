"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";

export type UserPreferences = {
  currency?: string;
  language?: string;
  notifications_enabled?: boolean;
  timezone?: string;
};

type UpdatePatch = Partial<UserPreferences>;

type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

const DEFAULT_DEBOUNCE_MS = 350;

function mergePrefs(base: UserPreferences, patch: UpdatePatch): UserPreferences {
  return { ...base, ...patch };
}

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Snapshot used for rollback on failed saves
  const lastGoodRef = useRef<UserPreferences | null>(null);

  // For last-write-wins + debounced patching
  const pendingPatchRef = useRef<UpdatePatch>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const res = await apiClient.get("/api/user/preferences");
    if (res === null) {
      // session expiry handler already ran in apiClient
      return;
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      setError(bodyText || res.statusText);
      setIsLoading(false);
      return;
    }

    const data = (await res.json()) as UserPreferences;
    lastGoodRef.current = data;
    setPreferences(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const applyOptimistic = useCallback((patch: UpdatePatch) => {
    setPreferences((prev) => {
      const base = prev ?? lastGoodRef.current ?? {};
      const next = mergePrefs(base, patch);
      return next;
    });
  }, []);

  const flushPending = useCallback(
    async (debouncePatch: UpdatePatch, opts?: { rollbackSnapshot?: UserPreferences | null }) => {
      if (debouncePatch && Object.keys(debouncePatch).length === 0) return;

      const rollbackSnapshot =
        opts?.rollbackSnapshot ?? (lastGoodRef.current ? { ...lastGoodRef.current } : null);

      // Optimistically: already applied in caller. Now persist.
      setSaveState((s) => (s === "idle" || s === "saved" ? "saving" : s));
      setError(null);

      const res = await apiClient.request("/api/user/preferences", {
        method: "PATCH",
        body: JSON.stringify(debouncePatch),
        headers: { "Content-Type": "application/json" },
      });

      if (res === null) {
        // session expiry handler already ran
        setSaveState("idle");
        return;
      }

      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        // rollback
        if (rollbackSnapshot) {
          lastGoodRef.current = rollbackSnapshot;
          setPreferences(rollbackSnapshot);
        }
        setError(bodyText || res.statusText);
        setSaveState("error");
        return;
      }

      const data = (await res.json().catch(() => null)) as Partial<UserPreferences> | null;
      const serverMerge = data ? mergePrefs(rollbackSnapshot ?? {}, data) : debouncePatch;
      lastGoodRef.current = serverMerge;
      setPreferences(serverMerge);
      setSaveState("saved");
    },
    []
  );

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const toFlush = pendingPatchRef.current;
    pendingPatchRef.current = {};

    if (toFlush && Object.keys(toFlush).length > 0) {
      const rollbackSnapshot = lastGoodRef.current ? { ...lastGoodRef.current } : null;
      await flushPending(toFlush, { rollbackSnapshot });
      return;
    }

    return;
  }, [flushPending]);

  const updatePreferences = useCallback(
    (patch: UpdatePatch, opts?: { debounceMs?: number; optimistic?: boolean }) => {
      const debounceMs = opts?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
      const optimistic = opts?.optimistic ?? true;

      // if not loaded yet, just store patch
      pendingPatchRef.current = mergePrefs(pendingPatchRef.current, patch);

      const snapshotBefore = optimistic
        ? lastGoodRef.current
          ? { ...lastGoodRef.current }
          : preferences
            ? { ...preferences }
            : null
        : null;

      if (optimistic) applyOptimistic(patch);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        const toFlush = pendingPatchRef.current;
        pendingPatchRef.current = {};

        // Ensure last-write-wins by chaining: if one flush is in flight, let latest patch replace pending.
        inFlightRef.current = flushPending(toFlush, { rollbackSnapshot: snapshotBefore }).finally(() => {
          inFlightRef.current = null;
          setTimeout(() => {
            // return to idle after saved/error transition
            setSaveState((s) => (s === "saved" || s === "error" ? "idle" : s));
          }, 1200);
        }) as any;
      }, debounceMs);
    },
    [applyOptimistic, flushPending, preferences]
  );

  const api = useMemo(
    () => ({
      preferences,
      isLoading,
      saveState,
      error,
      refresh,
      flush,
      updatePreferences,
      // helpers
      get currency() {
        return preferences?.currency;
      },
      get language() {
        return preferences?.language;
      },
      get notifications_enabled() {
        return preferences?.notifications_enabled;
      },
      get timezone() {
        return preferences?.timezone;
      },
    }),
    [error, flush, isLoading, preferences, saveState, refresh, updatePreferences]
  );

  return api;
}

