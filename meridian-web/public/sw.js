/*
 * MERIDIAN service worker
 *
 * Responsibilities
 *  1. Precache the app shell so the dashboard and focus timer boot offline.
 *  2. Runtime-cache static assets (cache-first) and API reads
 *     (stale-while-revalidate) so a cold, offline start still has data.
 *  3. Replay focus sessions that were completed while offline through the
 *     Background Sync API.
 *
 * The versioned cache names are the upgrade mechanism: bump CACHE_VERSION and
 * every old cache is dropped in `activate`.
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `meridian-static-${CACHE_VERSION}`
const PAGES_CACHE = `meridian-pages-${CACHE_VERSION}`
const API_CACHE = `meridian-api-${CACHE_VERSION}`
const CURRENT_CACHES = [STATIC_CACHE, PAGES_CACHE, API_CACHE]

/** Navigation fallback served when a route was never visited online. */
const OFFLINE_FALLBACK = '/'

/**
 * The shell precached on install. Kept deliberately small — everything else
 * is picked up by the runtime strategies on first use.
 */
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

/** Background Sync tag used for queued focus sessions. */
const FOCUS_SYNC_TAG = 'meridian-focus-sync'

/** IndexedDB mirror of the focus offline queue (see lib/pwa/sync-queue.ts). */
const DB_NAME = 'meridian-pwa'
const DB_VERSION = 1
const QUEUE_STORE = 'focus-sync-queue'

/** How long we wait for a page to confirm it drained the queue. */
const CLIENT_SYNC_TIMEOUT = 30000

// ---------------------------------------------------------------------------
// IndexedDB helpers (the SW cannot import the app's TypeScript module)
// ---------------------------------------------------------------------------

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readQueue() {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(QUEUE_STORE, 'readonly').objectStore(QUEUE_STORE).getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

// ---------------------------------------------------------------------------
// Install / activate
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      // addAll() is all-or-nothing; add individually so one 404 asset cannot
      // fail the whole installation.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }))
          } catch (error) {
            console.warn('[SW] Precache skipped:', url, error)
          }
        }),
      )
      // Activate immediately — the page also sends SKIP_WAITING when the user
      // accepts an update, but a first install should never wait.
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('meridian-') && !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
      await broadcast({ type: 'SW_ACTIVATED', version: CACHE_VERSION })
    })(),
  )
})

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)$/i.test(url.pathname)

const isApiRequest = (url) =>
  url.pathname.startsWith('/api/') || url.pathname.startsWith('/__meridian/')

/** Cache-first: immutable build output and images. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request, { ignoreVary: true })
  if (cached) return cached

  const response = await fetch(request)
  if (response && response.ok && response.type !== 'opaque') {
    cache.put(request, response.clone())
  }
  return response
}

/** Stale-while-revalidate: API reads — instant from cache, refreshed behind. */
async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request, { ignoreVary: true })

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)

  if (cached) {
    // Refresh in the background; the caller gets the cached copy now.
    event.waitUntil(network)
    return cached
  }

  const response = await network
  if (response) return response
  return new Response(JSON.stringify({ error: 'offline', cached: false }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Network-first with a cached fallback: HTML navigations. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request, { ignoreVary: true })
    if (cached) return cached

    const fallback = await caches.match(OFFLINE_FALLBACK, { ignoreVary: true })
    if (fallback) return fallback

    return new Response(
      '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
        '<body style="font-family:system-ui;background:#0a0a0a;color:#fafafa;' +
        'display:grid;place-items:center;height:100vh;margin:0">' +
        '<p>You are offline and this page has not been visited yet.</p></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only GETs are cacheable; writes (and cross-origin analytics beacons) pass
  // straight through to the network.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache Next.js dev/HMR or RSC action traffic.
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES_CACHE))
    return
  }

  if (isApiRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, event))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(async () => {
        const cached = await caches.match(request, { ignoreVary: true })
        return cached || new Response('', { status: 504, statusText: 'Offline' })
      }),
    )
  }
})

// ---------------------------------------------------------------------------
// Background sync for offline focus sessions
// ---------------------------------------------------------------------------

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const client of clients) client.postMessage(message)
  return clients.length
}

/**
 * Focus sessions are settled on-chain by the page (the wallet lives there), so
 * the sync event hands the work to an open client and waits for its ack. With
 * no client open we reject, which asks the browser to re-fire the sync later —
 * the queue itself is durable in IndexedDB, and `FocusContext` also drains it
 * on the next `online` event.
 */
async function replayFocusQueue() {
  const queue = await readQueue()
  if (queue.length === 0) return

  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  if (clients.length === 0) {
    throw new Error('[SW] No client available to replay focus queue; will retry')
  }

  const acked = await new Promise((resolve) => {
    const channel = new MessageChannel()
    const timer = setTimeout(() => resolve(false), CLIENT_SYNC_TIMEOUT)

    channel.port1.onmessage = (event) => {
      clearTimeout(timer)
      resolve(Boolean(event.data && event.data.synced))
    }

    clients[0].postMessage({ type: 'SYNC_FOCUS_QUEUE', pending: queue.length }, [channel.port2])
  })

  if (!acked) {
    throw new Error('[SW] Focus queue replay was not acknowledged; will retry')
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === FOCUS_SYNC_TAG) {
    event.waitUntil(replayFocusQueue())
  }
})

// Periodic Sync (Chromium, installed apps only) — best-effort top-up so a
// long-closed app still settles its backlog.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === FOCUS_SYNC_TAG) {
    event.waitUntil(replayFocusQueue().catch(() => {}))
  }
})

// ---------------------------------------------------------------------------
// Page -> worker messages
// ---------------------------------------------------------------------------

/**
 * Fetch and store `urls`, each into the cache its runtime strategy would use.
 * Used to backfill the first visit, during which the page is not yet
 * controlled and so none of its requests reach this worker.
 */
async function warmUrls(urls) {
  const [staticCache, pagesCache] = await Promise.all([
    caches.open(STATIC_CACHE),
    caches.open(PAGES_CACHE),
  ])

  await Promise.all(
    urls.map(async (rawUrl) => {
      try {
        const url = new URL(rawUrl, self.location.origin)
        if (url.origin !== self.location.origin) return

        const cache = isStaticAsset(url) ? staticCache : pagesCache
        if (await cache.match(url.href)) return // already stored

        const response = await fetch(url.href, { credentials: 'same-origin' })
        if (response && response.ok) await cache.put(url.href, response)
      } catch {
        // Offline or a URL that no longer exists — nothing to warm.
      }
    }),
  )
}

self.addEventListener('message', (event) => {
  const data = event.data || {}

  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'GET_VERSION':
      event.source?.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION })
      break

    // Warm the cache with URLs the page already used (first, uncontrolled
    // visit) or knows it is about to need. Each URL goes to the cache its
    // fetch strategy would have used, and anything already stored is skipped
    // so this costs nothing on repeat visits.
    case 'CACHE_URLS':
      event.waitUntil(warmUrls(data.urls || []))
      break

    // The page failed to reach the chain and parked a session — try again in
    // the background as soon as connectivity returns.
    case 'QUEUE_FOCUS_SYNC':
      event.waitUntil(
        (async () => {
          try {
            await self.registration.sync.register(FOCUS_SYNC_TAG)
          } catch (error) {
            // Background Sync unsupported (Safari/Firefox) — the page's own
            // `online` listener remains the fallback.
            console.warn('[SW] Background sync registration failed:', error)
          }
        })(),
      )
      break

    default:
      break
  }
})
