import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("logResponse", () => {
  it("does not log a successful response under the default (info) log level", async () => {
    vi.stubEnv("LOG_LEVEL", undefined);
    vi.resetModules();
    const { logResponse } = await import("./logger");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    logResponse("req_1", "GET", "/api/bills", 200, 12);

    expect(consoleLog).not.toHaveBeenCalled();
  });

  it("still logs a 4xx response as a warning under the default log level", async () => {
    vi.stubEnv("LOG_LEVEL", undefined);
    vi.resetModules();
    const { logResponse } = await import("./logger");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    logResponse("req_2", "GET", "/api/bills", 404, 8);

    expect(consoleLog).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(entry.level).toBe("warn");
    expect(entry.statusCode).toBe(404);
  });

  it("logs a successful response at debug level when LOG_LEVEL=debug", async () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    vi.resetModules();
    const { logResponse } = await import("./logger");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    logResponse("req_3", "GET", "/api/bills", 200, 5);

    expect(consoleLog).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(entry.level).toBe("debug");
  });
});
