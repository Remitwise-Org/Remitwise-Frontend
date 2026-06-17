type CacheClearer = () => void | Promise<void>;

const cacheClearers = new Map<string, CacheClearer>();

/**
 * Registers a cache clearance function under a unique name.
 * Registered clearers are invoked during bulk cache clearing operations.
 * 
 * @param name - The unique identifier/key of the cache to register.
 * @param clearer - The synchronous or asynchronous function that clears the specific cache.
 */
export function registerCache(name: string, clearer: CacheClearer): void {
  cacheClearers.set(name, clearer);
}

/**
 * Clears all registered caches sequentially by invoking their registered clearance functions.
 * 
 * @returns A promise that resolves to an array of names of the caches that were cleared.
 */
export async function clearRegisteredCaches(): Promise<string[]> {
  const cleared: string[] = [];
  for (const [name, clearer] of cacheClearers.entries()) {
    await clearer();
    cleared.push(name);
  }
  return cleared;
}

/**
 * Lists the names of all currently registered caches.
 * 
 * @returns An array of registered cache names.
 */
export function listRegisteredCaches(): string[] {
  return Array.from(cacheClearers.keys());
}


