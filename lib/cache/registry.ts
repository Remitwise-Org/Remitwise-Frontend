type CacheClearer = () => void | Promise<void>;

const cacheClearers = new Map<string, CacheClearer>();

export function registerCache(name: string, clearer: CacheClearer): void {
  cacheClearers.set(name, clearer);
}

export async function clearRegisteredCaches(): Promise<string[]> {
  const cleared: string[] = [];
  for (const [name, clearer] of cacheClearers.entries()) {
    await clearer();
    cleared.push(name);
  }
  return cleared;
}

export function listRegisteredCaches(): string[] {
  return Array.from(cacheClearers.keys());
}

