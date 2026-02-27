/**
 * Minimal in-process background runtime with graceful shutdown support.
 * Intended for Node server mode where jobs run in the same process.
 */

type ShutdownHook = () => void | Promise<void>;

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 15_000;

let shuttingDown = false;
let handlersRegistered = false;

const activeJobs = new Set<Promise<unknown>>();
const shutdownHooks = new Map<string, ShutdownHook>();

function getShutdownTimeoutMs(): number {
  const raw = process.env.SHUTDOWN_TIMEOUT_MS;
  if (!raw) return DEFAULT_SHUTDOWN_TIMEOUT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SHUTDOWN_TIMEOUT_MS;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trackJob<T>(job: Promise<T>): Promise<T> {
  activeJobs.add(job);
  job.finally(() => {
    activeJobs.delete(job);
  }).catch(() => {
    // ignore: rejection is handled by caller
  });
  return job;
}

async function runShutdown(signal: 'SIGTERM' | 'SIGINT'): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  console.info(`[shutdown] Received ${signal}. Stopping in-process background jobs...`);

  for (const [name, hook] of shutdownHooks.entries()) {
    try {
      await hook();
      console.info(`[shutdown] Hook completed: ${name}`);
    } catch (error) {
      console.error(`[shutdown] Hook failed: ${name}`, error);
    }
  }

  const inFlight = Promise.allSettled(Array.from(activeJobs));
  const timeoutMs = getShutdownTimeoutMs();
  await Promise.race([inFlight, wait(timeoutMs)]);

  console.info('[shutdown] Exit complete.');
  process.exit(0);
}

export function registerGracefulShutdown(): void {
  if (handlersRegistered) return;
  if (typeof process === 'undefined' || typeof process.on !== 'function') return;

  handlersRegistered = true;
  process.on('SIGTERM', () => {
    void runShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void runShutdown('SIGINT');
  });
}

export function registerShutdownHook(name: string, hook: ShutdownHook): void {
  registerGracefulShutdown();
  shutdownHooks.set(name, hook);
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/**
 * Registers an asynchronous background unit of work so graceful shutdown can wait for it.
 */
export function runBackgroundJob<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
  if (shuttingDown) {
    return Promise.reject(new Error(`Refusing new background job "${jobName}" during shutdown`));
  }
  const job = Promise.resolve().then(fn);
  return trackJob(job);
}

