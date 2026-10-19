"use client";

import { useEffect, useRef } from "react";

export interface UseKeyboardShortcutOptions {
  /**
   * The key to match (e.g. "k", "?", "Escape").
   * Compared case-insensitively against the `key` property of the event.
   */
  key: string;

  /**
   * Whether Ctrl (Windows/Linux) or ⌘ (macOS) must be held.
   * When `true`, either `ctrlKey` or `metaKey` will satisfy the condition.
   */
  mod?: boolean;

  /**
   * Whether the Shift key must be held.
   */
  shift?: boolean;

  /**
   * Whether the Alt/Option key must be held.
   */
  alt?: boolean;

  /**
   * Whether the listener is active. Defaults to `true`.
   * When `false` the listener is not registered.
   */
  enabled?: boolean;

  /**
   * When `true`, the shortcut is suppressed while the user is typing
   * inside an `<input>`, `<textarea>`, or `contentEditable` element.
   *
   * Defaults to `false`.
   */
  ignoreWhenEditing?: boolean;

  /**
   * Prevent the default action of the matched keyboard event.
   * Defaults to `true`.
   */
  preventDefault?: boolean;
}

/**
 * Registers a global keyboard shortcut, fires `handler` on match, and
 * unregisters on unmount.
 *
 * - Handles platform mod keys: on macOS `metaKey` matches, on
 *   Windows/Linux `ctrlKey` matches when `mod` is `true`.
 * - Supports `shift` and `alt` modifiers.
 * - Can be disabled via `enabled: false`.
 * - Optionally suppresses the shortcut while the user is typing in form
 *   fields (`ignoreWhenEditing`).
 *
 * The handler ref is kept up-to-date after every render, so callers don't
 * need to worry about stale closures.
 *
 * @example
 * ```tsx
 * useKeyboardShortcut(() => setIsOpen((prev) => !prev), {
 *   key: "k",
 *   mod: true,
 *   enabled: true,
 * });
 * ```
 */
export function useKeyboardShortcut(
  handler: (event: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions,
): void {
  const {
    key,
    mod = false,
    shift = false,
    alt = false,
    enabled = true,
    ignoreWhenEditing = false,
    preventDefault = true,
  } = options;

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const keyLower = key.toLowerCase();

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      return;
    }

    const listener = (event: KeyboardEvent) => {
      // ── Modifier checks ─────────────────────────────────────────────
      if (mod !== (event.metaKey || event.ctrlKey)) {
        return;
      }
      if (shift !== event.shiftKey) {
        return;
      }
      if (alt !== event.altKey) {
        return;
      }

      // ── Key match (case-insensitive) ────────────────────────────────
      if (event.key.toLowerCase() !== keyLower) {
        return;
      }

      // ── Suppress while editing ──────────────────────────────────────
      if (ignoreWhenEditing) {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
      }

      if (preventDefault) {
        event.preventDefault();
      }

      handlerRef.current(event);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, mod, shift, alt, enabled, ignoreWhenEditing, preventDefault]);
}
