import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../../lib/client/apiClient';
import { sessionHandler } from '../../lib/client/sessionHandler';

describe('apiClient', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create a mock fetch that we can track
    vi.stubGlobal('fetch', vi.fn());

    // Note: the jsdom test environment already provides a real `window` (with
    // `location` and `dispatchEvent`), so we don't stub it. The session-expiry
    // path that reads `window.location.pathname` runs through the mocked
    // `handleSessionExpiry` below, so the concrete pathname value is irrelevant.

    // Mock the sessionHandler methods
    vi.spyOn(sessionHandler, 'isSessionExpired').mockResolvedValue(false);
    vi.spyOn(sessionHandler, 'refreshSession').mockResolvedValue(true);
    vi.spyOn(sessionHandler, 'handleSessionExpiry').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return response normally on 200 OK', async () => {
    const mockResponse = new Response('ok', { status: 200 });
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse);

    const response = await apiClient.get('/api/test');
    
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // apiClient now injects a timeout AbortSignal on every request, so assert on
    // the method rather than exact-matching the options object.
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ method: 'GET', signal: expect.anything() })
    );
    expect(response).toBe(mockResponse);
    expect(sessionHandler.isSessionExpired).toHaveBeenCalledWith(mockResponse);
    expect(sessionHandler.refreshSession).not.toHaveBeenCalled();
  });

  it('should refresh and retry once on 401 session expiry', async () => {
    const mock401Response = new Response('{"message":"Session expired"}', { status: 401 });
    const mock200Response = new Response('ok', { status: 200 });
    
    // First fetch returns 401, second returns 200
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mock401Response)
      .mockResolvedValueOnce(mock200Response);
      
    // Mock isSessionExpired to return true for the 401 response and false for the 200 response
    vi.mocked(sessionHandler.isSessionExpired).mockImplementation(async (res) => res.status === 401);
    vi.mocked(sessionHandler.refreshSession).mockResolvedValueOnce(true);

    const response = await apiClient.get('/api/test');

    // Should have called fetch twice (initial + retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // Should have attempted refresh once
    expect(sessionHandler.refreshSession).toHaveBeenCalledTimes(1);
    // Should have returned the successful response
    expect(response).toBe(mock200Response);
    // Should not have triggered expiry flow
    expect(sessionHandler.handleSessionExpiry).not.toHaveBeenCalled();
  });

  it('should fallback to expiry flow if refresh fails', async () => {
    const mock401Response = new Response('{"message":"Session expired"}', { status: 401 });
    
    vi.mocked(global.fetch).mockResolvedValueOnce(mock401Response);
    vi.mocked(sessionHandler.isSessionExpired).mockResolvedValueOnce(true);
    // Refresh fails
    vi.mocked(sessionHandler.refreshSession).mockResolvedValueOnce(false);

    const response = await apiClient.get('/api/test');

    // Should have called fetch once (no retry since refresh failed)
    expect(global.fetch).toHaveBeenCalledTimes(1);
    // Should have attempted refresh
    expect(sessionHandler.refreshSession).toHaveBeenCalledTimes(1);
    // Should have triggered expiry flow
    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalledTimes(1);
    // Returns null on expiry
    expect(response).toBeNull();
  });

  it('should not retry on 403 Forbidden', async () => {
    const mock403Response = new Response('Forbidden', { status: 403 });
    vi.mocked(global.fetch).mockResolvedValueOnce(mock403Response);
    
    // 403 is not a session expiry
    vi.mocked(sessionHandler.isSessionExpired).mockResolvedValueOnce(false);

    const response = await apiClient.get('/api/test');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(sessionHandler.refreshSession).not.toHaveBeenCalled();
    expect(response).toBe(mock403Response);
  });
  
  it('should fallback to expiry flow if retry also returns 401', async () => {
    const mock401Response = new Response('{"message":"Session expired"}', { status: 401 });
    
    // Both initial and retry return 401
    vi.mocked(global.fetch)
      .mockResolvedValueOnce(mock401Response)
      .mockResolvedValueOnce(mock401Response);
      
    vi.mocked(sessionHandler.isSessionExpired).mockResolvedValue(true);
    // Refresh succeeds
    vi.mocked(sessionHandler.refreshSession).mockResolvedValueOnce(true);

    const response = await apiClient.get('/api/test');

    // Called fetch twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // Expiry flow triggered because retry failed
    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalledTimes(1);
    expect(response).toBeNull();
  });
});
