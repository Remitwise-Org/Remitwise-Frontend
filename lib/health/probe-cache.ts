import { registerCache } from "@/lib/cache/registry";

export const HEALTH_PROBE_CACHE_TTL_MS = 5_000;

export interface HealthProbeResults {
  database: { reachable: boolean; error?: string };
  rpc: {
    reachable: boolean;
    latestLedger?: number;
    protocolVersion?: number;
    networkPassphrase?: string;
    network?: string;
    error?: string;
  };
  anchor: {
    status: "ok" | "error" | "not_configured";
    reachable: boolean;
    error?: string;
  };
}

interface CacheEntry {
  results: HealthProbeResults;
  cachedAt: number;
}

let cacheEntry: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;

export async function getCachedHealthProbes(
  probe: () => Promise<HealthProbeResults>,
  bypassCache = false
): Promise<{ results: HealthProbeResults; cachedAgeMs: number }> {
  if (bypassCache) {
    return { results: await probe(), cachedAgeMs: 0 };
  }

  const age = cacheEntry ? Date.now() - cacheEntry.cachedAt : null;
  if (cacheEntry && age !== null && age < HEALTH_PROBE_CACHE_TTL_MS) {
    return {
      results: cacheEntry.results,
      cachedAgeMs: Math.max(0, age),
    };
  }

  let currentFlight = inFlight;
  if (!currentFlight) {
    currentFlight = Promise.resolve()
      .then(probe)
      .then((results) => {
        const entry = { results, cachedAt: Date.now() };
        if (inFlight === currentFlight) {
          cacheEntry = entry;
        }
        return entry;
      })
      .finally(() => {
        if (inFlight === currentFlight) {
          inFlight = null;
        }
      });
    inFlight = currentFlight;
  }

  const entry = await currentFlight;
  return {
    results: entry.results,
    cachedAgeMs: Math.max(0, Date.now() - entry.cachedAt),
  };
}

export function clearHealthProbeCache(): void {
  cacheEntry = null;
  inFlight = null;
}

registerCache("health_probes", clearHealthProbeCache);
