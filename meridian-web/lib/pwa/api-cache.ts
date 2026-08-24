/**
 * Cache Storage helpers for API payloads.
 *
 * The service worker already caches real network reads under the same cache
 * name (`meridian-api-v1` in `public/sw.js`). These helpers let the app write
 * into — and read cache-first from — that same bucket, which matters while
 * dashboard data still comes from a client-side mock: there is no request for
 * the worker to intercept, but the payload should survive a reload offline
 * exactly as if there had been one.
 *
 * Unlike localStorage this survives larger payloads, is async (so it never
 * blocks a frame), and is cleared together with the rest of the app's caches
 * when `CACHE_VERSION` is bumped.
 */

/** Must match `API_CACHE` in `public/sw.js`. */
export const API_CACHE_NAME = 'meridian-api-v1'

/** Canonical cache key for the dashboard payload. */
export const DASHBOARD_CACHE_URL = '/api/dashboard'

const CACHED_AT_HEADER = 'x-meridian-cached-at'

export interface CachedPayload<T> {
  data: T
  /** Epoch ms at which the payload was written. */
  cachedAt: number
}

function cacheStorageAvailable(): boolean {
  // `caches` is undefined on insecure origins and in older Safari.
  return typeof window !== 'undefined' && 'caches' in window
}

/** Read a payload written by either this module or the service worker. */
export async function readApiCache<T>(url: string): Promise<CachedPayload<T> | null> {
  if (!cacheStorageAvailable()) return null

  try {
    const cache = await caches.open(API_CACHE_NAME)
    const response = await cache.match(url)
    if (!response) return null

    const data = (await response.json()) as T
    const header = response.headers.get(CACHED_AT_HEADER)
    const dateHeader = response.headers.get('date')

    return {
      data,
      cachedAt: header
        ? Number(header)
        : dateHeader
          ? new Date(dateHeader).getTime()
          : Date.now(),
    }
  } catch (error) {
    console.warn('[PWA] Failed to read API cache:', error)
    return null
  }
}

/** Write a payload so it is available on the next cold, offline start. */
export async function writeApiCache<T>(url: string, data: T): Promise<void> {
  if (!cacheStorageAvailable()) return

  try {
    const cache = await caches.open(API_CACHE_NAME)
    await cache.put(
      url,
      new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          [CACHED_AT_HEADER]: Date.now().toString(),
        },
      }),
    )
  } catch (error) {
    console.warn('[PWA] Failed to write API cache:', error)
  }
}

/** Drop a stale payload (e.g. when it has outlived its TTL). */
export async function deleteApiCache(url: string): Promise<void> {
  if (!cacheStorageAvailable()) return
  try {
    const cache = await caches.open(API_CACHE_NAME)
    await cache.delete(url)
  } catch {
    // Nothing to clean up.
  }
}
