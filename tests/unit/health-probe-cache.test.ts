import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHealthProbeCache,
  getCachedHealthProbes,
  HEALTH_PROBE_CACHE_TTL_MS,
  HealthProbeResults,
} from "@/lib/health/probe-cache";

const probeResults: HealthProbeResults = {
  database: { reachable: true },
  rpc: { reachable: true, latestLedger: 42 },
  anchor: { status: "ok", reachable: true },
};

describe("health probe cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    clearHealthProbeCache();
  });

  afterEach(() => {
    clearHealthProbeCache();
    vi.useRealTimers();
  });

  it("coalesces concurrent probe requests", async () => {
    let finishProbe!: (results: HealthProbeResults) => void;
    const probe = vi.fn(
      () =>
        new Promise<HealthProbeResults>((resolve) => {
          finishProbe = resolve;
        })
    );

    const requests = Array.from({ length: 10 }, () => getCachedHealthProbes(probe));
    await Promise.resolve();
    finishProbe(probeResults);

    const responses = await Promise.all(requests);

    expect(probe).toHaveBeenCalledOnce();
    expect(responses.map(({ results }) => results)).toEqual(
      Array.from({ length: 10 }, () => probeResults)
    );
    expect(responses.every(({ cachedAgeMs }) => cachedAgeMs === 0)).toBe(true);
  });

  it("reuses results within the TTL and probes again after expiry", async () => {
    const probe = vi.fn().mockResolvedValue(probeResults);

    await getCachedHealthProbes(probe);
    vi.advanceTimersByTime(HEALTH_PROBE_CACHE_TTL_MS - 1);
    const cachedResponse = await getCachedHealthProbes(probe);

    expect(cachedResponse.cachedAgeMs).toBe(HEALTH_PROBE_CACHE_TTL_MS - 1);
    expect(probe).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(1);
    await getCachedHealthProbes(probe);

    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("lets a bypassed probe run without replacing the cached result", async () => {
    const cachedResults: HealthProbeResults = {
      ...probeResults,
      rpc: { reachable: true, latestLedger: 42 },
    };
    const freshResults: HealthProbeResults = {
      ...probeResults,
      rpc: { reachable: true, latestLedger: 43 },
    };
    const probe = vi
      .fn<() => Promise<HealthProbeResults>>()
      .mockResolvedValueOnce(cachedResults)
      .mockResolvedValueOnce(freshResults);

    await getCachedHealthProbes(probe);
    const fresh = await getCachedHealthProbes(probe, true);
    const cached = await getCachedHealthProbes(probe);

    expect(fresh.results.rpc.latestLedger).toBe(43);
    expect(fresh.cachedAgeMs).toBe(0);
    expect(cached.results.rpc.latestLedger).toBe(42);
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
