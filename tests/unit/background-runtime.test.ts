// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('background/runtime', () => {
  let registerGracefulShutdown: any;
  let registerShutdownHook: any;
  let isShuttingDown: any;
  let runBackgroundJob: any;

  let processOnSpy: any;
  let processExitSpy: any;
  let consoleInfoSpy: any;
  let consoleErrorSpy: any;
  const registeredSignalHandlers: Record<string, () => void> = {};

  beforeEach(async () => {
    // Enable fake timers
    vi.useFakeTimers();

    // Clear environment overrides
    delete process.env.SHUTDOWN_TIMEOUT_MS;

    // Reset captured signal handlers
    for (const key in registeredSignalHandlers) {
      delete registeredSignalHandlers[key];
    }

    // Mock process.on
    processOnSpy = vi.spyOn(process, 'on').mockImplementation((event: string, handler: any) => {
      registeredSignalHandlers[event] = handler;
      return process;
    });

    // Mock process.exit
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      return undefined as never;
    });

    // Mock console methods to avoid cluttering test output
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset module state before each test
    vi.resetModules();
    const mod = await import('@/lib/background/runtime');
    registerGracefulShutdown = mod.registerGracefulShutdown;
    registerShutdownHook = mod.registerShutdownHook;
    isShuttingDown = mod.isShuttingDown;
    runBackgroundJob = mod.runBackgroundJob;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initially indicates not shutting down', () => {
    expect(isShuttingDown()).toBe(false);
  });

  it('registers SIGTERM and SIGINT handlers', () => {
    registerGracefulShutdown();
    expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('only registers process handlers once', () => {
    registerGracefulShutdown();
    registerGracefulShutdown();
    // process.on should only be called once for each signal
    const sigtermCalls = processOnSpy.mock.calls.filter(([sig]: any) => sig === 'SIGTERM');
    expect(sigtermCalls.length).toBe(1);
  });

  it('transitions isShuttingDown to true on signal and exits', async () => {
    registerGracefulShutdown();
    expect(isShuttingDown()).toBe(false);

    // Simulate SIGTERM signal
    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    expect(sigtermHandler).toBeDefined();

    const shutdownPromise = sigtermHandler();
    expect(isShuttingDown()).toBe(true);

    await vi.runAllTimersAsync();
    await shutdownPromise;
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('avoids second shutdown runs on multiple signals', async () => {
    registerGracefulShutdown();
    const sigtermHandler = registeredSignalHandlers['SIGTERM'];

    const firstRun = sigtermHandler();
    const secondRun = sigtermHandler();

    // second run should resolve immediately / be a noop
    expect(secondRun).toBeUndefined(); 
    await firstRun;
  });

  it('runs registered background jobs and untracks them on completion (success)', async () => {
    let jobCompleted = false;
    const jobPromise = runBackgroundJob('test-success-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      jobCompleted = true;
      return 'success-result';
    });

    // Advance timer to let job complete
    await vi.advanceTimersByTimeAsync(100);

    const result = await jobPromise;
    expect(result).toBe('success-result');
    expect(jobCompleted).toBe(true);
  });

  it('runs registered background jobs and untracks them on completion (rejection)', async () => {
    const jobPromise = runBackgroundJob('test-failure-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error('job-failed');
    });

    await vi.advanceTimersByTimeAsync(100);

    await expect(jobPromise).rejects.toThrow('job-failed');
  });

  it('refuses new background jobs during shutdown', async () => {
    registerGracefulShutdown();
    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    
    // Start shutdown
    const shutdownPromise = sigtermHandler();
    expect(isShuttingDown()).toBe(true);

    // Try to run a new job
    await expect(
      runBackgroundJob('late-job', async () => 'should-not-run')
    ).rejects.toThrow('Refusing new background job "late-job" during shutdown');

    await shutdownPromise;
  });

  it('executes hooks in registration order on shutdown', async () => {
    const executionOrder: string[] = [];
    registerShutdownHook('first-hook', async () => {
      executionOrder.push('first');
    });
    registerShutdownHook('second-hook', async () => {
      executionOrder.push('second');
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    await sigtermHandler();

    expect(executionOrder).toEqual(['first', 'second']);
  });

  it('continues shutdown even if a hook throws an error', async () => {
    registerShutdownHook('throwing-hook', async () => {
      throw new Error('hook error');
    });
    let secondHookExecuted = false;
    registerShutdownHook('safe-hook', async () => {
      secondHookExecuted = true;
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    const shutdownPromise = sigtermHandler();

    await vi.runAllTimersAsync();
    await shutdownPromise;

    expect(secondHookExecuted).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hook failed: throwing-hook'),
      expect.any(Error)
    );
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('drains active jobs before exiting', async () => {
    registerGracefulShutdown();
    let jobFinished = false;

    // Start a background job
    runBackgroundJob('draining-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      jobFinished = true;
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    const shutdownPromise = sigtermHandler();

    // Advance time partly; exit should not have been called yet because job is in-flight
    await vi.advanceTimersByTimeAsync(200);
    expect(processExitSpy).not.toHaveBeenCalled();
    expect(jobFinished).toBe(false);

    // Advance remaining time to complete the job
    await vi.advanceTimersByTimeAsync(300);
    await shutdownPromise;

    expect(jobFinished).toBe(true);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('forces exit after timeout if active jobs exceed shutdown timeout', async () => {
    registerGracefulShutdown();
    let jobFinished = false;

    // Start a long-running background job (20s)
    runBackgroundJob('slow-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      jobFinished = true;
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    const shutdownPromise = sigtermHandler();

    // Default shutdown timeout is 15s. Advance by 15s.
    await vi.advanceTimersByTimeAsync(15_000);
    await shutdownPromise;

    // Job should NOT have finished, but shutdown exited anyway
    expect(jobFinished).toBe(false);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('respects custom timeout configured via SHUTDOWN_TIMEOUT_MS env var', async () => {
    process.env.SHUTDOWN_TIMEOUT_MS = '5000'; // 5 seconds
    registerGracefulShutdown();
    let jobFinished = false;

    runBackgroundJob('slow-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      jobFinished = true;
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    const shutdownPromise = sigtermHandler();

    // Advance by custom timeout (5s)
    await vi.advanceTimersByTimeAsync(5_000);
    await shutdownPromise;

    expect(jobFinished).toBe(false);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('falls back to default timeout if SHUTDOWN_TIMEOUT_MS is invalid or negative', async () => {
    process.env.SHUTDOWN_TIMEOUT_MS = '-100'; // negative
    registerGracefulShutdown();
    let jobFinished = false;

    runBackgroundJob('slow-job', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      jobFinished = true;
    });

    const sigtermHandler = registeredSignalHandlers['SIGTERM'];
    const shutdownPromise = sigtermHandler();

    // Should fall back to default (15s). Advance 15s.
    await vi.advanceTimersByTimeAsync(15_000);
    await shutdownPromise;

    expect(jobFinished).toBe(false);
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it('does not register handlers if process is undefined (e.g. browser context)', async () => {
    const originalProcess = global.process;
    // @ts-ignore
    delete global.process;

    // Re-import module under undefined process context
    vi.resetModules();
    const mod = await import('@/lib/background/runtime');
    
    // Should not throw or crash
    expect(() => mod.registerGracefulShutdown()).not.toThrow();

    // Restore process
    global.process = originalProcess;
  });
});
