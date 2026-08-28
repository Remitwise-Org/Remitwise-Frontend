export interface ApiErrorResponse {
  message?: string;
  code?: string;
  data?: unknown;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public data?: unknown;

  constructor(status: number, message: string, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  retries?: number;
  retryDelay?: number;
  token?: string;
  timeout?: number;
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private getAuthHeader(customToken?: string): Record<string, string> {
    if (customToken) {
      return { Authorization: `Bearer ${customToken}` };
    }
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
    return {};
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (!params) return url;

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    if (!queryString) return url;

    return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      params,
      retries = 3,
      retryDelay = 500,
      token,
      headers = {},
      signal,
      timeout = 5000,
      ...customConfig
    } = options;

    const fullURL = this.buildURL(endpoint, params);
    const authHeaders = this.getAuthHeader(token);

    const mergedHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...authHeaders,
      ...(headers as Record<string, string>),
    };

    let attempt = 0;

    while (attempt < retries) {
      attempt++;
      try {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

        const combinedSignal = signal
          ? AbortSignal.any
            ? AbortSignal.any([signal, timeoutController.signal])
            : signal
          : timeoutController.signal;

        let response: Response;
        try {
          response = await fetch(fullURL, {
            ...customConfig,
            headers: mergedHeaders,
            signal: combinedSignal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!response.ok) {
          const status = response.status;
          let errorData: ApiErrorResponse = {};
          try {
            errorData = (await response.json()) as ApiErrorResponse;
          } catch {
            // response was not JSON
          }

          const errorMessage = errorData.message || `HTTP Error ${status}: ${response.statusText}`;
          const apiError = new ApiError(status, errorMessage, errorData.code, errorData.data);

          // Retry condition: 429 (Too Many Requests) or 5xx Server Errors
          const isRetryable = status === 429 || (status >= 500 && status <= 599);
          if (isRetryable && attempt < retries) {
            // Exponential backoff with jitter
            const backoff = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
            await this.sleep(backoff);
            continue;
          }

          throw apiError;
        }

        if (response.status === 24) {
          return {} as T;
        }

        return (await response.json()) as T;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          throw err;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }

        // Network error or other fetch failures
        if (attempt < retries) {
          const backoff = retryDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
          await this.sleep(backoff);
          continue;
        }

        throw new ApiError(
          0,
          err instanceof Error ? err.message : 'Network failure or request interrupted',
          'NETWORK_ERROR'
        );
      }
    }

    throw new ApiError(0, 'Maximum retry attempts reached', 'RETRY_LIMIT_EXCEEDED');
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
