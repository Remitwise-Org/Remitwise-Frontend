import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/client/apiClient';
import { generateRequestId } from '../../lib/requestId';
import { sessionHandler } from '../../lib/client/sessionHandler';

vi.mock('../../lib/client/sessionHandler', () => ({
  sessionHandler: {
    isSessionExpired: vi.fn().mockResolvedValue(false),
    refreshSession: vi.fn().mockResolvedValue(false),
    handleSessionExpiry: vi.fn(),
  },
}));

vi.mock('../../lib/requestId', () => ({
  generateRequestId: vi.fn(() => 'generated-request-id'),
}));

describe('apiClient shared headers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
    vi.clearAllMocks();
    apiClient.setAuthToken(null);
    (sessionHandler.isSessionExpired as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  afterEach(() => {
    apiClient.setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it('injects the configured bearer token and a generated request ID', async () => {
    apiClient.setAuthToken('stellar-public-key');

    await apiClient.get('/api/account', { retries: 0 });

    const options = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get('authorization')).toBe('Bearer stellar-public-key');
    expect(headers.get('x-request-id')).toBe('generated-request-id');
    expect(generateRequestId).toHaveBeenCalledTimes(1);
  });

  it('does not replace explicitly supplied authorization or request ID headers', async () => {
    apiClient.setAuthToken('default-token');

    await apiClient.get('/api/account', {
      retries: 0,
      headers: {
        Authorization: 'Bearer forwarded-token',
        'X-Request-ID': 'support-request-42',
      },
    });

    const options = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(headers.get('authorization')).toBe('Bearer forwarded-token');
    expect(headers.get('x-request-id')).toBe('support-request-42');
    expect(generateRequestId).not.toHaveBeenCalled();
  });

  it('reuses one request ID on retries and the session refresh replay', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ status: 503, headers: { get: () => null } })
      .mockResolvedValueOnce({ status: 401, headers: { get: () => null } })
      .mockResolvedValueOnce({ status: 200, headers: { get: () => null } });
    (sessionHandler.isSessionExpired as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    (sessionHandler.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await apiClient.get('/api/account', { retries: 1, backoff: 0 });

    const requestIds = (fetch as ReturnType<typeof vi.fn>).mock.calls.map(([, options]) =>
      new Headers((options as RequestInit).headers).get('x-request-id')
    );
    expect(requestIds).toEqual(['generated-request-id', 'generated-request-id', 'generated-request-id']);
    expect(generateRequestId).toHaveBeenCalledTimes(1);
  });
});
