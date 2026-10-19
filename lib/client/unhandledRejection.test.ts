import { describe, it, expect, vi, afterEach } from "vitest";
import { errorReporter } from "./errorReporter";
import {
  handleUnhandledRejection,
  registerUnhandledRejectionHandler,
} from "./unhandledRejection";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleUnhandledRejection", () => {
  it("reports an Error reason as-is", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});
    const error = new Error("boom");

    handleUnhandledRejection({ reason: error });

    expect(spy).toHaveBeenCalledWith(error, { source: "unhandledrejection" });
  });

  it("wraps a string reason in an Error with that message", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});

    handleUnhandledRejection({ reason: "rejected with a string" });

    expect(spy).toHaveBeenCalledTimes(1);
    const [reportedError] = spy.mock.calls[0];
    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toBe("rejected with a string");
  });

  it("wraps a non-Error, non-string reason (e.g. a plain object) in an Error", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});

    handleUnhandledRejection({ reason: { code: "TIMEOUT" } });

    expect(spy).toHaveBeenCalledTimes(1);
    const [reportedError] = spy.mock.calls[0];
    expect(reportedError).toBeInstanceOf(Error);
    expect((reportedError as Error).message).toBe('{"code":"TIMEOUT"}');
  });

  it("never throws for an unserializable reason", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => handleUnhandledRejection({ reason: circular })).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("registerUnhandledRejectionHandler", () => {
  it("reports through the shared error reporter when the window fires unhandledrejection", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});
    const unregister = registerUnhandledRejectionHandler();

    const error = new Error("from a real event");
    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: error }) as PromiseRejectionEvent,
    );

    expect(spy).toHaveBeenCalledWith(error, { source: "unhandledrejection" });
    unregister();
  });

  it("stops reporting after the returned cleanup function is called", () => {
    const spy = vi.spyOn(errorReporter, "captureException").mockImplementation(() => {});
    const unregister = registerUnhandledRejectionHandler();
    unregister();

    window.dispatchEvent(
      Object.assign(new Event("unhandledrejection"), { reason: new Error("late") }) as PromiseRejectionEvent,
    );

    expect(spy).not.toHaveBeenCalled();
  });
});
