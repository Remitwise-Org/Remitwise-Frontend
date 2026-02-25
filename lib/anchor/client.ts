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

const DEFAULT_TIMEOUT_MS = 5000;

export class AnchorClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.ANCHOR_API_BASE_URL || '';
        if (!this.baseUrl) {
            console.warn('ANCHOR_API_BASE_URL is not set. Anchor API calls may fail.');
        }
    }

    /**
     * Helper method to perform fetch with timeout
     */
    private async fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(id);
            return response;
        } catch (error: unknown) {
            clearTimeout(id);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeoutMs}ms`);
            }
            throw error;
        }
    }

    /**
     * Fetches the current exchange rates from the Anchor API.
     * Based on SEP-38: /info or /prices depending on the implementation.
     * Assuming a simplified /rates endpoint for this client.
     */
    async getExchangeRates(): Promise<ExchangeRate[]> {
        if (!this.baseUrl) throw new Error('Anchor Base URL not configured');

        const url = `${this.baseUrl}/rates`;

        try {
            const response = await this.fetchWithTimeout(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch rates: HTTP ${response.status}`);
            }

            // We expect the anchor to return an array of rates or an object containing an array.
            // Adjust according to the actual anchor API specification.
            const data = await response.json();
            return data.rates || data;
        } catch (error) {
            console.error('AnchorClient: Error fetching exchange rates:', error);
            throw error;
        }
    }

    /**
     * Fetches a quote for a specific pair and amount.
     */
    async getQuote({ from, to, amount }: QuoteRequest): Promise<QuoteResponse> {
        if (!this.baseUrl) throw new Error('Anchor Base URL not configured');

        const url = new URL(`${this.baseUrl}/quote`);
        url.searchParams.append('sell_asset', from);
        url.searchParams.append('buy_asset', to);
        url.searchParams.append('sell_amount', amount);

        try {
            const response = await this.fetchWithTimeout(url.toString());

            if (!response.ok) {
                throw new Error(`Failed to fetch quote: HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('AnchorClient: Error fetching quote:', error);
            throw error;
        }
    }
}

// Export a singleton instance for direct utility usage
export const anchorClient = new AnchorClient();
