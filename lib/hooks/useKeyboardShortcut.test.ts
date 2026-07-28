import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcut } from "./useKeyboardShortcut";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeKeyEvent(
  key: string,
  modifiers: {
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
  } = {},
): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    ctrlKey: modifiers.ctrl ?? false,
    metaKey: modifiers.meta ?? false,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
    bubbles: true,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useKeyboardShortcut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Registers ────────────────────────────────────────────────────────

  describe("registration", () => {
    it("adds a keydown listener on mount", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      expect(addSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("does not add a listener when enabled is false", () => {
      // Count existing keydown listeners before the hook is rendered
      const addSpy = vi.spyOn(window, "addEventListener");
      const beforeCallCount = addSpy.mock.calls.filter(
        ([event]) => event === "keydown",
      ).length;

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?", enabled: false }),
      );

      const afterCallCount = addSpy.mock.calls.filter(
        ([event]) => event === "keydown",
      ).length;

      // When disabled, no new keydown listener should be registered
      expect(afterCallCount).toBe(beforeCallCount);
    });

    it("adds the listener when enabled transitions from false to true", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const handler = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useKeyboardShortcut(handler, { key: "?", enabled }),
        { initialProps: { enabled: false } as { enabled: boolean } },
      );

      rerender({ enabled: true });

      const keydownCalls = addSpy.mock.calls.filter(
        ([event]) => event === "keydown",
      );
      expect(keydownCalls.length).toBeGreaterThan(0);
    });
  });

  // ── Fires on match ───────────────────────────────────────────────────

  describe("fires on match", () => {
    it("calls the handler when the key matches", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("matches case-insensitively", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k" }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("K"));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("calls the handler when mod+key matches with ctrlKey", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("k", { ctrl: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("calls the handler when mod+key matches with metaKey", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("k", { meta: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("calls the handler when shift is required and held", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "Tab", shift: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("Tab", { shift: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("calls the handler when alt is required and held", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "a", alt: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("a", { alt: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("calls the handler when multiple modifiers are required", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "s",
          mod: true,
          shift: true,
        }),
      );

      act(() => {
        window.dispatchEvent(
          makeKeyEvent("s", { ctrl: true, shift: true }),
        );
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ── Does NOT fire on non-match ───────────────────────────────────────

  describe("does not fire on non-matching keys", () => {
    it("does not call the handler when a different key is pressed", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("a"));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not call the handler when mod is required but not held", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("k"));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not call the handler when shift is required but not held", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "Tab", shift: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("Tab"));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not call the handler when alt is required but not held", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "F4", alt: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("F4"));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not call the handler with altKey when mod is required", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("k", { alt: true }));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("does not call the handler when enabled is false", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?", enabled: false }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ── Unregisters on unmount ───────────────────────────────────────────

  describe("unregisters on unmount", () => {
    it("stops calling the handler after the component unmounts", () => {
      const handler = vi.fn();
      const { unmount } = renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      // Fire once to confirm it works before unmount
      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });
      expect(handler).toHaveBeenCalledTimes(1);

      unmount();

      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });
      expect(handler).toHaveBeenCalledTimes(1); // no additional call
    });

    it("removes the listener when unmounted", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const handler = vi.fn();

      const { unmount } = renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      unmount();

      expect(removeSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });

    it("removes the listener when enabled transitions from true to false", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const handler = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useKeyboardShortcut(handler, { key: "?", enabled }),
        { initialProps: { enabled: true } as { enabled: boolean } },
      );

      rerender({ enabled: false });

      expect(removeSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );
    });
  });

  // ── Platform mod keys ────────────────────────────────────────────────

  describe("platform mod keys", () => {
    it("treats ctrlKey as the platform mod for the mod option", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "p", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("p", { ctrl: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("treats metaKey as the platform mod for the mod option", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "p", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("p", { meta: true }));
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("does not fire when both metaKey and ctrlKey are false for a mod shortcut", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(makeKeyEvent("k"));
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("fires once even when both ctrlKey and metaKey are true", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "k", mod: true }),
      );

      act(() => {
        window.dispatchEvent(
          makeKeyEvent("k", { ctrl: true, meta: true }),
        );
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("allows shift to be combined with mod", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "i",
          mod: true,
          shift: true,
        }),
      );

      act(() => {
        window.dispatchEvent(
          makeKeyEvent("i", { meta: true, shift: true }),
        );
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ── ignoreWhenEditing ────────────────────────────────────────────────

  describe("ignoreWhenEditing", () => {
    it("does not fire when the active element is an input", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "?",
          ignoreWhenEditing: true,
        }),
      );

      act(() => {
        input.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it("does not fire when the active element is a textarea", () => {
      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      textarea.focus();

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "?",
          ignoreWhenEditing: true,
        }),
      );

      act(() => {
        textarea.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it("does not fire when the active element is contentEditable", () => {
      const div = document.createElement("div");
      div.setAttribute("contenteditable", "true");
      // jsdom may not reflect isContentEditable from the attribute alone,
      // so force the getter for the test.
      Object.defineProperty(div, "isContentEditable", {
        get: () => true,
        configurable: true,
      });
      document.body.appendChild(div);
      div.focus();

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "?",
          ignoreWhenEditing: true,
        }),
      );

      // Dispatch on the div so event.target is the contentEditable div.
      // Listener is on window, event bubbles, but guard blocks it.
      act(() => {
        div.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it("fires when the active element is not an editing element", () => {
      const button = document.createElement("button");
      document.body.appendChild(button);
      button.focus();

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, {
          key: "?",
          ignoreWhenEditing: true,
        }),
      );

      act(() => {
        button.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).toHaveBeenCalledTimes(1);

      document.body.removeChild(button);
    });

    it("fires in editing elements when ignoreWhenEditing is false (default)", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      act(() => {
        input.dispatchEvent(makeKeyEvent("?"));
      });

      expect(handler).toHaveBeenCalledTimes(1);

      document.body.removeChild(input);
    });
  });

  // ── preventDefault behaviour ─────────────────────────────────────────

  describe("preventDefault", () => {
    it("prevents default by default", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      const event = makeKeyEvent("?");
      const preventSpy = vi.spyOn(event, "preventDefault");

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventSpy).toHaveBeenCalled();
    });

    it("does not prevent default when preventDefault is false", () => {
      const handler = vi.fn();
      renderHook(() =>
        useKeyboardShortcut(handler, { key: "?", preventDefault: false }),
      );

      const event = makeKeyEvent("?");
      const preventSpy = vi.spyOn(event, "preventDefault");

      act(() => {
        window.dispatchEvent(event);
      });

      expect(preventSpy).not.toHaveBeenCalled();
    });
  });

  // ── Handler ref freshness ────────────────────────────────────────────

  describe("handler staleness", () => {
    it("calls the latest handler when the handler reference changes", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const { rerender } = renderHook(
        ({ handler }) => useKeyboardShortcut(handler, { key: "?" }),
        { initialProps: { handler: handler1 } },
      );

      // Fire with handler1
      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);

      // Rerender with handler2
      rerender({ handler: handler2 });

      act(() => {
        window.dispatchEvent(makeKeyEvent("?"));
      });
      expect(handler1).toHaveBeenCalledTimes(1); // no extra call
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  // ── SSR safety ───────────────────────────────────────────────────────

  describe("SSR safety", () => {
    it("renders and unmounts cleanly in a DOM environment", () => {
      // jsdom always provides window, so the `typeof window === "undefined"`
      // branch inside useEffect is not exercised here. This smoke test
      // verifies the hook handles the full mount → unmount lifecycle
      // without throwing.
      const handler = vi.fn();
      const { unmount } = renderHook(() =>
        useKeyboardShortcut(handler, { key: "?" }),
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
