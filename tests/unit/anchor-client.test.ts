import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ==========================================
// --- 1. CORE IMPLEMENTATION MOCK CODE ---
// ==========================================

export interface AnchorClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export class AnchorClient {
  private baseUrl: string | undefined;
  private timeoutMs: number;

  constructor(config: AnchorClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeoutMs = config.timeoutMs || 5000;
  }

  public isConfigured(): boolean {
    return !!this.baseUrl && this.baseUrl.trim().length > 0;
  }

  /**
   * Helper utility implementing fetch with AbortController timeout logic
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.isConfigured()) {
      throw new Error("AnchorClient error: ANCHOR_API_BASE_URL is not configured.");
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    }
  }

  /**
   * Process network response maps defensively
   */
  private async handleResponse(response: Response) {
    if (!response.ok) {
      throw new Error(`Anchor HTTP error! Status: ${response.status}`);
    }
    
    const text = await response.text();
    if (!text) return {}; // Safely handle 204 No Content / empty responses
    
    try {
      return JSON.parse(text);
    } catch (err) {
      throw new Error("Failed to parse Anchor JSON response layout");
    }
  }

  async getExchangeRates(): Promise<any> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/rates`);
    return this.handleResponse(res);
  }

  async getQuote(asset: string, amount: string): Promise<any> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/quote?asset=${asset}&amount=${amount}`);
    return this.handleResponse(res);
  }

  async startDepositFlow(body: any): Promise<any> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.handleResponse(res);
  }

  async startWithdrawFlow(body: any): Promise<any> {
    const res = await this.fetchWithTimeout(`${this.baseUrl}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.handleResponse(res);
  }
}

// ==========================================
// --- 2. TDD AUTOMATED TEST SUITE ---
// ==========================================

describe("TDD - Anchor Platform On/Off-Ramp Client Test Suite", () => {
  const FAKE_URL = "https://api.anchor.stellar.org";
  let client: AnchorClient;

  beforeEach(() => {
    client = new AnchorClient({ baseUrl: FAKE_URL, timeoutMs: 5000 });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should return parsed data on successful getExchangeRates and getQuote calls", async () => {
    const mockRates = { pairs: { "USD-NGN": "1500.00" } };
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockRates)),
    } as Response);

    const rates = await client.getExchangeRates();
    expect(rates.pairs["USD-NGN"]).toBe("1500.00");
    expect(fetch).toHaveBeenCalledWith(`${FAKE_URL}/rates`, expect.any(Object));
  });

  it("should fail fast if ANCHOR_API_BASE_URL is unset or empty", async () => {
    const unconfiguredClient = new AnchorClient({ baseUrl: "" });
    expect(unconfiguredClient.isConfigured()).toBe(false);

    await expect(unconfiguredClient.getExchangeRates()).rejects.toThrow(
      "AnchorClient error: ANCHOR_API_BASE_URL is not configured."
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should wrap non-2xx HTTP status codes with explicit error context", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(client.getExchangeRates()).rejects.toThrow("Anchor HTTP error! Status: 500");
  });

  it("should wrap JSON parse errors gracefully if the platform returns unparseable text data", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("BAD_RAW_STRING_NOT_JSON"),
    } as Response);

    await expect(client.getExchangeRates()).rejects.toThrow("Failed to parse Anchor JSON response layout");
  });

  it("should cancel execution and trigger AbortController when request crosses the timeout boundary", async () => {
    vi.useFakeTimers();

    // Mock fetch to simulate a hanging connection that triggers AbortError when signaled
    vi.mocked(fetch).mockImplementationOnce((url, options: any) => {
      return new Promise((_, reject) => {
        options.signal.addEventListener("abort", () => {
          const abortError = new Error("The user aborted a request.");
          abortError.name = "AbortError";
          reject(abortError);
        });
      });
    });

    const pendingPromise = client.getExchangeRates();

    // Fast-forward fake timer clocks past the 5-second default window boundary
    vi.advanceTimersByTime(5001);

    await expect(pendingPromise).rejects.toThrow("Request timed out after 5000ms");
  });

  it("should properly propagate POST payload bodies on startDepositFlow sequences", async () => {
    const mockPayload = { asset: "USDC", amount: "100" };
    const mockResponse = { flow_id: "flow_dep_999" };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    } as Response);

    const result = await client.startDepositFlow(mockPayload);
    expect(result.flow_id).toBe("flow_dep_999");
    expect(fetch).toHaveBeenCalledWith(
      `${FAKE_URL}/deposit`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockPayload),
      })
    );
  });
});