import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("lib/background/runtime", () => {
  let mod: typeof import("../../lib/background/runtime");
  let capturedHandlers: Record<string, (...args: unknown[]) => void>;

  beforeEach(async () => {
    capturedHandlers = {};
    vi.useFakeTimers();
    vi.resetModules();

    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.spyOn(process, "on").mockImplementation(
      (event: unknown, handler: unknown) => {
        capturedHandlers[event as string] = handler as (
          ...args: unknown[]
        ) => void;
        return process as NodeJS.EventEmitter;
      }
    );
    vi.spyOn(process, "exit").mockImplementation(
      (_code?: number) => undefined as never
    );

    mod = await import("../../lib/background/runtime");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.SHUTDOWN_TIMEOUT_MS;
  });

  // ── registerGracefulShutdown ──────────────────────────────────────────────

  describe("registerGracefulShutdown()", () => {
    it("registers SIGTERM handler", () => {
      mod.registerGracefulShutdown();
      expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    });

    it("registers SIGINT handler", () => {
      mod.registerGracefulShutdown();
      expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    });

    it("is idempotent — calling twice registers once per signal", () => {
      mod.registerGracefulShutdown();
      mod.registerGracefulShutdown();
      const sigtermCalls = (
        process.on as ReturnType<typeof vi.fn>
      ).mock.calls.filter((c) => c[0] === "SIGTERM");
      expect(sigtermCalls).toHaveLength(1);
    });
  });

  // ── isShuttingDown ────────────────────────────────────────────────────────

  describe("isShuttingDown()", () => {
    it("returns false before any signal", () => {
      expect(mod.isShuttingDown()).toBe(false);
    });

    it("returns true synchronously after SIGTERM fires", () => {
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();
      expect(mod.isShuttingDown()).toBe(true);
    });

    it("returns true synchronously after SIGINT fires", () => {
      mod.registerGracefulShutdown();
      capturedHandlers["SIGINT"]?.();
      expect(mod.isShuttingDown()).toBe(true);
    });
  });

  // ── runBackgroundJob ──────────────────────────────────────────────────────

  describe("runBackgroundJob()", () => {
    it("returns job result to caller", async () => {
      const result = await mod.runBackgroundJob("test", () =>
        Promise.resolve(42)
      );
      expect(result).toBe(42);
    });

    it("propagates job rejection to caller", async () => {
      await expect(
        mod.runBackgroundJob("fail", () => Promise.reject(new Error("boom")))
      ).rejects.toThrow("boom");
    });

    it("rejects immediately when already shutting down", async () => {
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();

      await expect(
        mod.runBackgroundJob("late", () => Promise.resolve())
      ).rejects.toThrow(/Refusing new background job "late" during shutdown/);
    });

    it("waits for active jobs before calling process.exit", async () => {
      let resolveJob!: () => void;
      const deferred = new Promise<void>((r) => {
        resolveJob = r;
      });

      mod.runBackgroundJob("slow", () => deferred);
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();

      // Advance less than timeout — job still running
      await vi.advanceTimersByTimeAsync(2_000);
      expect(process.exit).not.toHaveBeenCalled();

      // Resolve job — shutdown should now finish
      resolveJob();
      await vi.runAllTimersAsync();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("unregisters a completed job (zero active jobs → fast exit)", async () => {
      const job = mod.runBackgroundJob("quick", () =>
        Promise.resolve("done")
      );
      await job;

      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("unregisters a rejected job (zero active jobs → fast exit)", async () => {
      const job = mod.runBackgroundJob("err", () =>
        Promise.reject(new Error("x"))
      );
      await expect(job).rejects.toThrow("x");

      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  // ── registerShutdownHook ──────────────────────────────────────────────────

  describe("registerShutdownHook()", () => {
    it("executes registered hook during shutdown", async () => {
      const hook = vi.fn().mockResolvedValue(undefined);
      mod.registerShutdownHook("my-hook", hook);
      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(hook).toHaveBeenCalledTimes(1);
    });

    it("runs multiple hooks in registration order", async () => {
      const order: string[] = [];
      mod.registerShutdownHook("a", async () => { order.push("a"); });
      mod.registerShutdownHook("b", async () => { order.push("b"); });
      mod.registerShutdownHook("c", async () => { order.push("c"); });

      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(order).toEqual(["a", "b", "c"]);
    });

    it("continues to next hook when one throws", async () => {
      const bad = vi.fn().mockRejectedValue(new Error("hook error"));
      const good = vi.fn().mockResolvedValue(undefined);
      mod.registerShutdownHook("bad", bad);
      mod.registerShutdownHook("good", good);

      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(good).toHaveBeenCalled();
    });

    it("re-registering same name replaces previous hook", async () => {
      const first = vi.fn().mockResolvedValue(undefined);
      const second = vi.fn().mockResolvedValue(undefined);
      mod.registerShutdownHook("hook", first);
      mod.registerShutdownHook("hook", second);

      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  // ── shutdown timeout ──────────────────────────────────────────────────────

  describe("shutdown timeout", () => {
    it("exits after default 15 s if jobs hang", async () => {
      mod.runBackgroundJob("stuck", () => new Promise(() => {}));
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();

      await vi.advanceTimersByTimeAsync(14_999);
      expect(process.exit).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("respects SHUTDOWN_TIMEOUT_MS env override", async () => {
      process.env.SHUTDOWN_TIMEOUT_MS = "3000";

      mod.runBackgroundJob("stuck", () => new Promise(() => {}));
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();

      await vi.advanceTimersByTimeAsync(2_999);
      expect(process.exit).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("falls back to 15 s when SHUTDOWN_TIMEOUT_MS is not a number", async () => {
      process.env.SHUTDOWN_TIMEOUT_MS = "not-a-number";

      mod.runBackgroundJob("stuck", () => new Promise(() => {}));
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();

      await vi.advanceTimersByTimeAsync(14_000);
      expect(process.exit).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1_001);
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  // ── concurrent signals ────────────────────────────────────────────────────

  describe("concurrent signals", () => {
    it("second SIGTERM is a no-op — process.exit called once", async () => {
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();
      capturedHandlers["SIGTERM"]?.();
      await vi.runAllTimersAsync();
      expect(process.exit).toHaveBeenCalledTimes(1);
    });

    it("SIGINT after SIGTERM is a no-op — process.exit called once", async () => {
      mod.registerGracefulShutdown();
      capturedHandlers["SIGTERM"]?.();
      capturedHandlers["SIGINT"]?.();
      await vi.runAllTimersAsync();
      expect(process.exit).toHaveBeenCalledTimes(1);
    });
  });
});
