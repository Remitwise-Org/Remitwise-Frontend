import { useEffect, useState } from "react";

export interface UseVisibilityChangeOptions {
  /** Callback fired when the document/tab transitions to visible */
  onVisible?: () => void;
  /** Callback fired when the document/tab transitions to hidden */
  onHidden?: () => void;
  /** Callback fired on any visibility transition with the new state */
  onChange?: (isVisible: boolean) => void;
}

/**
 * Custom React hook that tracks tab/document visibility state
 * and fires callbacks on visibility transitions.
 */
export function useVisibilityChange(options: UseVisibilityChangeOptions = {}): boolean {
  const { onVisible, onHidden, onChange } = options;

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {

      const visible = !document.hidden;
      setIsVisible(visible);

      if (onChange) {
        onChange(visible);
      }

      if (visible && onVisible) {
        onVisible();
      } else if (!visible && onHidden) {
        onHidden();
      }
    };

    // Fire onChange initially with the current visibility state
    if (onChange) {
      onChange(!document.hidden);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onVisible, onHidden, onChange]);

  return isVisible;
}
