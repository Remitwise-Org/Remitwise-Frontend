type CacheClearer = () => void | Promise<void>;

const cacheClearers = new Map<string, CacheClearer>();

/**
 * Registers a cache clearance function under a unique name.
 * Registered clearers are invoked during bulk cache clearing operations.
 *
 * If a name is already registered, the previous clearer is silently overwritten.
 * This prevents memory leaks from duplicate registrations while allowing
 * hot-replacement in development.
 *
 * @param name - The unique identifier/key of the cache to register.
 *               Must be a non-empty string.
 * @param clearer - The synchronous or asynchronous function that clears
 *                  the specific cache.
 * @throws {Error} If name is empty or not a string.
 *
 * @example
 * ```typescript
 * import { registerCache } from '@/lib/cache/registry';
 * import { clearCache } from '@/lib/cache/contract-cache';
 *
 * registerCache('contract_cache', clearCache);
 * ```
 */
export function registerCache(name: string, clearer: CacheClearer): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Cache name must be a non-empty string');
  }
  if (typeof clearer !== 'function') {
    throw new Error('Cache clearer must be a function');
  }
  cacheClearers.set(name, clearer);
}

/**
 * Clears all registered caches sequentially by invoking their registered
 * clearance functions.
 *
 * Iterates over every entry in the registry and awaits each clearer.
 * If a clearer throws, the error is caught, logged, and the iteration
 * continues so that one failing cache does not block others.
 *
 * @returns A promise that resolves to an array of names of the caches
 *          that were successfully cleared.
 *
 * @example
 * ```typescript
 * const cleared = await clearRegisteredCaches();
 * console.log('Cleared caches:', cleared);
 * ```
 */
export async function clearRegisteredCaches(): Promise<string[]> {
  const cleared: string[] = [];
  for (const [name, clearer] of cacheClearers.entries()) {
    try {
      await clearer();
      cleared.push(name);
    } catch (error) {
      // Log but continue — one failing cache must not block the fan-out
      console.error(`Cache clearer "${name}" threw during clear-all:`, error);
    }
  }
  return cleared;
}

/**
 * Clears a single registered cache by name.
 *
 * This is the selective-invalidate counterpart to {@link clearRegisteredCaches}.
 * It targets exactly one cache subsystem, leaving all others untouched.
 *
 * @param name - The unique identifier of the cache to invalidate.
 * @returns `true` if the cache was found and its clearer invoked successfully;
 *          `false` if no cache is registered under that name.
 * @throws {Error} If the registered clearer throws.
 *
 * @example
 * ```typescript
 * const ok = await invalidateCache('anchor_rates');
 * if (!ok) console.warn('No cache named anchor_rates');
 * ```
 */
export async function invalidateCache(name: string): Promise<boolean> {
  if (!name || typeof name !== 'string') {
    throw new Error('Cache name must be a non-empty string');
  }
  const clearer = cacheClearers.get(name);
  if (!clearer) {
    return false;
  }
  await clearer();
  return true;
}

/**
 * Lists the names of all currently registered caches.
 *
 * @returns An array of registered cache names. The order is insertion order
 *          (Map iteration order).
 *
 * @example
 * ```typescript
 * const names = listRegisteredCaches();
 * // ['contract_cache', 'anchor_rates']
 * ```
 */
export function listRegisteredCaches(): string[] {
  return Array.from(cacheClearers.keys());
}

/**
 * Resets the registry by removing all registered caches.
 *
 * **Intended for testing only.** In production this would break the
 * admin clear/invalidate fan-out because live caches would no longer
 * be registered.
 *
 * @internal
 */
export function resetRegistry(): void {
  cacheClearers.clear();
}


