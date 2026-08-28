/**
 * Service worker registration and lifecycle reporting.
 *
 * Registration itself happens in a tiny inline script injected by
 * `app/layout.tsx` (see `SW_REGISTRATION_SCRIPT`) so it starts before React
 * hydrates. That script records the lifecycle state on `window.__meridianSW`
 * and dispatches `meridian:sw-state`; everything in this module reads from
 * those two, so the page never registers the worker twice.
 */

/**
 * `installing` … `redundant` mirror `ServiceWorker.state` verbatim; the rest
 * describe states the spec has no value for.
 */
export type ServiceWorkerStatus =
  | 'unsupported'
  | 'pending'
  | 'installing'
  | 'installed'
  | 'activating'
  | 'activated'
  | 'redundant'
  | 'error'

export const SW_URL = '/sw.js'
export const SW_SCOPE = '/'
export const SW_STATE_EVENT = 'meridian:sw-state'

export interface ServiceWorkerSnapshot {
  status: ServiceWorkerStatus
  /** `performance.now()` at which the worker reached `activated`. */
  activatedAt: number | null
  /** True when the page is being served by a controlling worker. */
  controlled: boolean
  error?: string
}

declare global {
  interface Window {
    __meridianSW?: ServiceWorkerSnapshot
  }
}

/**
 * Inline registration script. Kept dependency-free and small enough to sit in
 * the document: it must run before hydration so the very first navigation of a
 * repeat visit is already served from the cache.
 */
export const SW_REGISTRATION_SCRIPT = `
(function () {
  var state = { status: 'pending', activatedAt: null, controlled: false };
  window.__meridianSW = state;

  function emit(status, extra) {
    state.status = status;
    state.controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    if (status === 'activated' && state.activatedAt === null) {
      state.activatedAt = performance.now();
    }
    if (extra) state.error = extra;
    window.dispatchEvent(new CustomEvent('${SW_STATE_EVENT}', { detail: Object.assign({}, state) }));
  }

  if (!('serviceWorker' in navigator)) {
    emit('unsupported');
    return;
  }

  function track(worker) {
    if (!worker) return;
    emit(worker.state);
    worker.addEventListener('statechange', function () {
      emit(worker.state);
    });
  }

  // On the very first visit the page is not controlled yet, so none of its
  // requests pass through the worker and nothing lands in the cache. Hand the
  // worker the resources this page actually used (lazy route chunks included)
  // so a *second* visit works offline rather than a third.
  function warmCache() {
    try {
      var origin = location.origin;
      var urls = performance
        .getEntriesByType('resource')
        .map(function (entry) { return entry.name; })
        .filter(function (url) {
          return url.indexOf(origin) === 0 &&
            /\\/_next\\/static\\/|\\.(?:css|js|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico)(?:\\?|$)/.test(url);
        });
      urls.push(location.pathname);

      navigator.serviceWorker.ready.then(function (registration) {
        var worker = registration.active || navigator.serviceWorker.controller;
        if (worker) worker.postMessage({ type: 'CACHE_URLS', urls: urls });
      });
    } catch (error) {
      /* Resource timing unavailable — the runtime strategies still apply. */
    }
  }

  function register() {
    navigator.serviceWorker
      .register('${SW_URL}', { scope: '${SW_SCOPE}' })
      .then(function (registration) {
        track(registration.installing || registration.waiting || registration.active);
        registration.addEventListener('updatefound', function () {
          track(registration.installing);
        });
        if (navigator.serviceWorker.controller) emit('activated');
      })
      .catch(function (error) {
        emit('error', String(error && error.message ? error.message : error));
      });
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    emit('activated');
  });

  function start() {
    register();
    // Twice: once the page has settled, and again after the lazily-imported
    // sections have had time to pull their own chunks.
    setTimeout(warmCache, 3000);
    setTimeout(warmCache, 10000);
  }

  // Registering after load keeps the worker off the critical path for the
  // first visit, where there is nothing cached to gain from it anyway.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
`.trim()

const UNSUPPORTED: ServiceWorkerSnapshot = {
  status: 'unsupported',
  activatedAt: null,
  controlled: false,
}

/** Current lifecycle snapshot; safe to call during SSR. */
export function getServiceWorkerSnapshot(): ServiceWorkerSnapshot {
  if (typeof window === 'undefined') return UNSUPPORTED
  return window.__meridianSW ?? { status: 'pending', activatedAt: null, controlled: false }
}

/** Subscribe to lifecycle changes. Returns an unsubscribe function. */
export function subscribeToServiceWorker(
  listener: (snapshot: ServiceWorkerSnapshot) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    listener((event as CustomEvent<ServiceWorkerSnapshot>).detail)
  }

  window.addEventListener(SW_STATE_EVENT, handler)
  return () => window.removeEventListener(SW_STATE_EVENT, handler)
}

/**
 * Subscribe to messages posted by the worker.
 *
 * The handler receives the message data and the `MessagePort` the worker is
 * waiting on (present for request/ack messages such as `SYNC_FOCUS_QUEUE`).
 */
export function subscribeToServiceWorkerMessages(
  type: string,
  handler: (data: any, port?: MessagePort) => void,
): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}

  const listener = (event: MessageEvent) => {
    if (event.data?.type === type) handler(event.data, event.ports?.[0])
  }

  navigator.serviceWorker.addEventListener('message', listener)
  return () => navigator.serviceWorker.removeEventListener('message', listener)
}

/** Send a message to the active worker, if there is one. */
export async function postToServiceWorker(message: unknown): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage(message)
  } catch {
    // No worker yet — nothing to notify.
  }
}

/** Ask the worker to precache routes the user is likely to open next. */
export function precacheRoutes(urls: string[]): Promise<void> {
  return postToServiceWorker({ type: 'CACHE_URLS', urls })
}
