export interface ExchangeRate {
    sell_asset: string;
    buy_asset: string;
    price: string;
}

export interface QuoteRequest {
    from: string;
    to: string;
    amount: string;
}

export interface QuoteResponse {
    price: string;
    sell_amount: string;
    buy_amount: string;
    fee: {
        total: string;
        asset: string;
    };
}

export interface AnchorFlowRequest {
    amount: string;
    currency: string;
    account: string;
    destination?: string;
}

export interface AnchorFlowResponse {
    id?: string;
    transaction_id?: string;
    url?: string;
    interactive_url?: string;
    steps?: unknown[];
    [key: string]: unknown;
}

export interface AnchorTransactionResponse {
    id?: string;
    status: string;
    [key: string]: unknown;
}

const ALLOWED_ANCHOR_URL_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Anchor deposit/withdraw flow URLs come from the anchor's own API response --
 * external, untrusted input from the app's perspective. A compromised anchor
 * (or a MITM) returning a `javascript:`/`data:` URL here must never reach the
 * client as something that later gets rendered as a link or navigated to.
 * Fails closed: returns undefined for anything that isn't an absolute
 * http(s) URL, including malformed strings and non-string input.
 */
export function sanitizeAnchorUrl(rawUrl: unknown): string | undefined {
    if (typeof rawUrl !== 'string') return undefined;
    try {
        const parsed = new URL(rawUrl);
        return ALLOWED_ANCHOR_URL_PROTOCOLS.has(parsed.protocol) ? rawUrl : undefined;
    } catch {
        return undefined;
    }
}

import { fetchWithTimeout } from '../fetch-timeout';
import {
  ANCHOR_DEFAULT_TIMEOUT_MS,
} from '../config/fetch-timeouts';

/**
 * @deprecated Import {@link ANCHOR_DEFAULT_TIMEOUT_MS} from
 *   `lib/config/fetch-timeouts` instead. This re-export is kept for backwards
 *   compatibility only and will be removed in a future release.
 */
export const DEFAULT_TIMEOUT_MS = ANCHOR_DEFAULT_TIMEOUT_MS;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 200;

function isTransientHttpStatus(status: number): boolean {
    return status >= 500;
}

export class AnchorClient {
    private _baseUrl: string;
    private _apiKey: string;
    private _depositPath: string;
    private _withdrawPath: string;
    private _transactionPath: string;
    private maxRetryAttempts: number;

    constructor(options?: { maxRetryAttempts?: number; baseUrl?: string; apiKey?: string }) {
        this._baseUrl = options?.baseUrl ?? process.env.ANCHOR_API_BASE_URL ?? '';
        this._apiKey = options?.apiKey ?? process.env.ANCHOR_API_KEY ?? '';
        this._depositPath = process.env.ANCHOR_DEPOSIT_PATH || '/transactions/deposit/interactive';
        this._withdrawPath = process.env.ANCHOR_WITHDRAW_PATH || '/transactions/withdraw/interactive';
        this._transactionPath = process.env.ANCHOR_TRANSACTION_PATH || '/transaction';
        this.maxRetryAttempts = options?.maxRetryAttempts ?? MAX_RETRY_ATTEMPTS;
        if (!this.baseUrl) {
            console.warn('ANCHOR_API_BASE_URL is not set. Anchor API calls may fail.');
        }
    }

    get baseUrl(): string {
        return process.env.ANCHOR_API_BASE_URL || this._baseUrl || '';
    }

    set baseUrl(value: string) {
        this._baseUrl = value;
    }

    get apiKey(): string {
        return process.env.ANCHOR_API_KEY || this._apiKey || '';
    }

    set apiKey(value: string) {
        this._apiKey = value;
    }

    get depositPath(): string {
        return process.env.ANCHOR_DEPOSIT_PATH || this._depositPath || '/transactions/deposit/interactive';
    }

    get withdrawPath(): string {
        return process.env.ANCHOR_WITHDRAW_PATH || this._withdrawPath || '/transactions/withdraw/interactive';
    }

    get transactionPath(): string {
        return process.env.ANCHOR_TRANSACTION_PATH || this._transactionPath || '/transaction';
    }

    isConfigured(): boolean {
        return Boolean(this.baseUrl);
    }

    /**
     * Delegates to the shared {@link fetchWithTimeout} wrapper from
     * `lib/fetch-timeout.ts`, which resolves the timeout from the
     * per-endpoint policy table when none is supplied explicitly.
     */
    private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs?: number): Promise<Response> {
        return fetchWithTimeout(url, options, timeoutMs ?? DEFAULT_TIMEOUT_MS);
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retries transient failures (network errors, timeout, 5xx) with exponential backoff.
     * 4xx responses are returned immediately without retrying.
     */
    private async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < this.maxRetryAttempts; attempt++) {
            if (attempt > 0) {
                const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
                await this.sleep(delay);
            }

            try {
                const response = await this.fetchWithTimeout(url, options);

                if (response.status >= 400 && response.status < 500) {
                    return response;
                }

                if (isTransientHttpStatus(response.status)) {
                    lastError = new Error(`Server error: HTTP ${response.status}`);
                    continue;
                }

                return response;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
            }
        }

        throw lastError ?? new Error('Anchor request failed after max retry attempts');
    }

    /**
     * Fetches the current exchange rates from the Anchor API with retry/backoff.
     */
    async getExchangeRates(): Promise<ExchangeRate[]> {
        if (!this.baseUrl) throw new Error('Anchor Base URL not configured');

        const url = `${this.baseUrl}/rates`;

        try {
            const response = await this.fetchWithRetry(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch rates: HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.rates || data;
        } catch (error) {
            console.error('AnchorClient: Error fetching exchange rates:', error);
            throw error;
        }
    }

    /**
     * Fetches a quote for a specific pair and amount with retry/backoff.
     */
    async getQuote({ from, to, amount }: QuoteRequest): Promise<QuoteResponse> {
        if (!this.baseUrl) throw new Error('Anchor Base URL not configured');

        const url = new URL(`${this.baseUrl}/quote`);
        url.searchParams.append('sell_asset', from);
        url.searchParams.append('buy_asset', to);
        url.searchParams.append('sell_amount', amount);

        try {
            const response = await this.fetchWithRetry(url.toString());

            if (!response.ok) {
                throw new Error(`Failed to fetch quote: HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AnchorClient: Error fetching quote:', error);
            throw error;
        }
    }

    private async startFlow(path: string, payload: AnchorFlowRequest): Promise<AnchorFlowResponse> {
        if (!this.baseUrl) throw new Error('Anchor Base URL not configured');

        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let detail = '';
            try {
                detail = await response.text();
            } catch {
                // ignore body parse issues
            }
            throw new Error(`Anchor flow failed: HTTP ${response.status}${detail ? ` - ${detail}` : ''}`);
        }

        return await response.json();
    }

    async startDepositFlow(payload: AnchorFlowRequest): Promise<AnchorFlowResponse> {
        return this.startFlow(this.depositPath, payload);
    }

    async startWithdrawFlow(payload: AnchorFlowRequest): Promise<AnchorFlowResponse> {
        return this.startFlow(this.withdrawPath, payload);
    }

    /**
     * Fetches the transaction status by ID from the Anchor API with retry/backoff.
     */
    async getAnchorTransactionStatus(id: string): Promise<AnchorTransactionResponse | null> {
        if (!id) {
            throw new Error('Transaction ID is required');
        }
        if (!this.baseUrl) {
            throw new Error('Anchor Base URL not configured');
        }

        const path = this.transactionPath || '/transaction';
        const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
        url.searchParams.set('id', id);

        const headers: Record<string, string> = {
            Accept: 'application/json',
        };
        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }

        const response = await this.fetchWithRetry(url.toString(), {
            method: 'GET',
            headers,
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            let detail = '';
            try {
                detail = await response.text();
            } catch {
                // ignore body parse issues
            }
            throw new Error(`Failed to fetch transaction status: HTTP ${response.status}${detail ? ` - ${detail}` : ''}`);
        }

        const data = await response.json();
        return (data && (data.transaction || data)) || null;
    }
}

export const anchorClient = new AnchorClient();

export async function getAnchorTransactionStatus(id: string): Promise<AnchorTransactionResponse | null> {
    return anchorClient.getAnchorTransactionStatus(id);
}
