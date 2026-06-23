import { vi, describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../../lib/client/apiClient';
import { sessionHandler } from '../../lib/client/sessionHandler';

// Mock sessionHandler
vi.mock('../../lib/client/sessionHandler', () => ({
  sessionHandler: {
    isSessionExpired: vi.fn(),
    refreshSession: vi.fn().mockResolvedValue(false),
    handleSessionExpiry: vi.fn(),
  }
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('should retry on 500 error', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ status: 500 })
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({ data: 'ok' }) });

    (sessionHandler.isSessionExpired as any).mockResolvedValue(false);

    // Use a small backoff to make tests run fast
    const response = await apiClient.get('/api/test', { retries: 1, backoff: 10 });
    
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  it('should retry on network error', async () => {
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ status: 200, json: () => Promise.resolve({ data: 'ok' }) });

    (sessionHandler.isSessionExpired as any).mockResolvedValue(false);

    const response = await apiClient.get('/api/test', { retries: 1, backoff: 10 });
    
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  it('should not retry on 401 (session expired) as it is handled separately', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ status: 401 });

    (sessionHandler.isSessionExpired as any).mockResolvedValue(true);

    const response = await apiClient.get('/api/test', { retries: 1, backoff: 10 });
    
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response).toBeNull();
    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalled();
  });
});
