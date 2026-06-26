import { useState, useEffect } from "react";

export type MotionPreference = "system" | "reduced" | "no-preference";

const STORAGE_KEY = "motionPreference";

export function getStoredMotionPreference(): MotionPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (raw === "reduced" || raw === "no-preference" || raw === "system") return raw as MotionPreference;
    return null;
  } catch {
    return null;
  }
}

export function setStoredMotionPreference(value: MotionPreference) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent("motionPreferenceChange", { detail: value }));
  } catch {}
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const readEffectivePreference = (): boolean => {
      const stored = getStoredMotionPreference();
      if (stored === "reduced") return true;
      if (stored === "no-preference") return false;
      // system or unset
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = () => setPrefersReducedMotion(readEffectivePreference());

    updatePreference();

    const mqListener = (event: MediaQueryListEvent) => {
      // only update when using system preference
      const stored = getStoredMotionPreference();
      if (!stored || stored === "system") {
        setPrefersReducedMotion(event.matches);
      }
    };

    const storageListener = () => updatePreference();
    const customListener = (e: Event) => updatePreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", mqListener as EventListener);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(mqListener as any);
    }

    window.addEventListener("storage", storageListener);
    window.addEventListener("motionPreferenceChange", customListener as EventListener);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", mqListener as EventListener);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(mqListener as any);
      }
      window.removeEventListener("storage", storageListener);
      window.removeEventListener("motionPreferenceChange", customListener as EventListener);
    };
  }, []);

  return prefersReducedMotion;
}
