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
});
