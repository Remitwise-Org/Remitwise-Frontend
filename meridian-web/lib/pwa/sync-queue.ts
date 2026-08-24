/**
 * Durable mirror of the focus offline queue.
 *
 * `FocusContext` keeps the queue in localStorage for synchronous reads during
 * render, but the service worker cannot touch localStorage — so every mutation
 * is mirrored into IndexedDB, which the worker reads when a Background Sync
 * event fires. localStorage stays the source of truth for the UI; IndexedDB is
 * the source of truth for "is there anything left to replay?".
 *
 * Every function fails soft: private-mode browsers and old Safari versions may
 * reject `indexedDB.open`, and the app must keep working when they do.
 */

export const DB_NAME = 'meridian-pwa'
export const DB_VERSION = 1
export const QUEUE_STORE = 'focus-sync-queue'

/** Background Sync tag; must match the one registered in `public/sw.js`. */
export const FOCUS_SYNC_TAG = 'meridian-focus-sync'

export interface SyncQueueRecord {
  id: string
  durationMinutes: number
  xpEarned: number
  timestamp: number
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDatabase().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null)
          return
        }
        try {
          const tx = db.transaction(QUEUE_STORE, mode)
          const request = work(tx.objectStore(QUEUE_STORE))
          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => resolve(null)
          tx.oncomplete = () => db.close()
          tx.onabort = () => {
            db.close()
            resolve(null)
          }
        } catch {
          db.close()
          resolve(null)
        }
      }),
  )
}

/** Read every queued session (used by the service worker and on rehydrate). */
export async function readSyncQueue(): Promise<SyncQueueRecord[]> {
  const records = await runTransaction<SyncQueueRecord[]>('readonly', (store) =>
    store.getAll() as IDBRequest<SyncQueueRecord[]>,
  )
  return records ?? []
}

/** Replace the mirror with `records` — called after every queue mutation. */
export async function writeSyncQueue(records: SyncQueueRecord[]): Promise<void> {
  const db = await openDatabase()
  if (!db) return

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      const store = tx.objectStore(QUEUE_STORE)
      store.clear()
      for (const record of records) store.put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
      tx.onabort = () => resolve()
    } catch {
      resolve()
    }
  })
  db.close()
}

/**
 * Ask the service worker to replay the queue as soon as connectivity is back.
 *
 * Resolves to `true` when Background Sync accepted the registration. A `false`
 * result is expected on Safari and Firefox, where the caller must rely on the
 * `online` event instead.
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const sync = (registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }).sync

    if (!sync) {
      // No Background Sync — nudge the worker anyway so it can re-broadcast
      // once it next wakes up with a live connection.
      registration.active?.postMessage({ type: 'QUEUE_FOCUS_SYNC' })
      return false
    }

    await sync.register(FOCUS_SYNC_TAG)
    return true
  } catch (error) {
    console.warn('[PWA] Background sync unavailable:', error)
    return false
  }
}
