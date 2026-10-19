import { describe, it, expect, vi, beforeEach } from "vitest";

const initMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: (...args: unknown[]) => initMock(...args),
  replayIntegration: () => "replay-integration",
}));

const isAnalyticsAllowedMock = vi.fn();
vi.mock("@/lib/consent/consent", () => ({
  isAnalyticsAllowed: () => isAnalyticsAllowedMock(),
}));

const idleCallbacks: Array<() => void> = [];
vi.mock("@/lib/utils/idleCallback", () => ({
  safeRequestIdleCallback: (cb: () => void) => {
    idleCallbacks.push(cb);
    return 1;
  },
}));

beforeEach(() => {
  vi.resetModules();
  initMock.mockClear();
  idleCallbacks.length = 0;
});

describe("sentry.client.config", () => {
  it("defers Sentry.init to an idle callback instead of calling it synchronously", async () => {
    isAnalyticsAllowedMock.mockReturnValue(true);

    await import("../../sentry.client.config");
    expect(initMock).not.toHaveBeenCalled();
    expect(idleCallbacks).toHaveLength(1);

    idleCallbacks[0]();
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it("never schedules or calls Sentry.init when consent is not granted", async () => {
    isAnalyticsAllowedMock.mockReturnValue(false);

    await import("../../sentry.client.config");

    expect(idleCallbacks).toHaveLength(0);
    expect(initMock).not.toHaveBeenCalled();
  });
});
