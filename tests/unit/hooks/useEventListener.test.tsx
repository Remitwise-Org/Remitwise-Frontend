import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEventListener } from "@/lib/hooks/useEventListener";

afterEach(() => {
  cleanup();
});

describe("useEventListener", () => {
  it("registers a type-safe window listener and removes it on unmount", () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    const Harness = () => {
      useEventListener("keydown", handler);
      return null;
    };

    const { unmount } = render(<Harness />);
    const event = new KeyboardEvent("keydown", { key: "Escape" });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledWith(event);

    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("uses the latest handler without replacing the listener", () => {
    const firstHandler = vi.fn<(event: MouseEvent) => void>();
    const secondHandler = vi.fn<(event: MouseEvent) => void>();
    const Harness = ({ handler }: { handler: (event: MouseEvent) => void }) => {
      useEventListener("click", handler);
      return null;
    };

    const { rerender } = render(<Harness handler={firstHandler} />);
    rerender(<Harness handler={secondHandler} />);

    const event = new MouseEvent("click");
    act(() => {
      window.dispatchEvent(event);
    });

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledWith(event);
  });

  it("supports a ref target and cleans up its listener", () => {
    const handler = vi.fn<(event: Event) => void>();
    const Harness = () => {
      const ref = useRef<HTMLButtonElement>(null);
      useEventListener("click", handler, ref);
      return <button ref={ref} type="button">Click</button>;
    };

    const { container, unmount } = render(<Harness />);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("registers a document target listener and removes it on unmount", () => {
    const handler = vi.fn<(event: KeyboardEvent) => void>();
    const Harness = () => {
      useEventListener("keydown", handler, document);
      return null;
    };

    const { unmount } = render(<Harness />);
    const event = new KeyboardEvent("keydown", { key: "Escape" });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledWith(event);

    unmount();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not leak listeners across repeated mount and unmount cycles", () => {
    const handler = vi.fn<(event: MouseEvent) => void>();
    const Harness = () => {
      useEventListener("click", handler);
      return null;
    };

    for (let cycle = 0; cycle < 3; cycle += 1) {
      const { unmount } = render(<Harness />);

      act(() => {
        window.dispatchEvent(new MouseEvent("click"));
      });
      // Exactly one more call per mount — if a prior cycle's listener had
      // leaked, this would jump by more than one on later cycles.
      expect(handler).toHaveBeenCalledTimes(cycle + 1);

      unmount();
      act(() => {
        window.dispatchEvent(new MouseEvent("click"));
      });
      // Unmounting must not leave a listener behind either.
      expect(handler).toHaveBeenCalledTimes(cycle + 1);
    }
  });

  it("does not throw or invoke the handler when the ref target is null throughout the component's lifecycle", () => {
    const handler = vi.fn<(event: Event) => void>();
    const Harness = () => {
      // Deliberately never attached to a rendered element, so
      // ref.current stays null for the component's entire lifecycle.
      const ref = useRef<HTMLDivElement>(null);
      useEventListener("click", handler, ref);
      return <div />;
    };

    const { unmount } = render(<Harness />);

    act(() => {
      window.dispatchEvent(new MouseEvent("click"));
      document.dispatchEvent(new MouseEvent("click"));
    });

    expect(handler).not.toHaveBeenCalled();
    expect(() => unmount()).not.toThrow();
  });
});
