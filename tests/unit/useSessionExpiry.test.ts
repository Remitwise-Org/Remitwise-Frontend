import { renderHook, act } from '@testing-library/react';
import { useSessionExpiry } from '../../lib/client/useSessionExpiry';
import { apiClient } from '../../lib/client/apiClient';

jest.mock('../../lib/client/apiClient');

test('staySignedIn calls refresh endpoint and dispatches event on success', async () => {
  (apiClient.post as jest.Mock).mockResolvedValue({});
  const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  
  const { result } = renderHook(() => useSessionExpiry());
  
  let success;
  await act(async () => {
    success = await result.current.staySignedIn();
  });
  
  expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh');
  expect(success).toBe(true);
  expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
});

test('staySignedIn returns false on failure', async () => {
  (apiClient.post as jest.Mock).mockRejectedValue(new Error('401'));
  
  const { result } = renderHook(() => useSessionExpiry());
  
  let success;
  await act(async () => {
    success = await result.current.staySignedIn();
  });
  
  expect(success).toBe(false);
});
