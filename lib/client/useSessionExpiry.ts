import { useState, useCallback } from 'react';
import { apiClient } from './apiClient';

export const useSessionExpiry = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const staySignedIn = useCallback(async () => {
    // Check if refresh is enabled (or handle as needed)
    if (process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED !== 'true') {
      console.warn('Session refresh is disabled.');
      return false;
    }

    setIsRefreshing(true);
    try {
      // Use the server-aware apiClient to ensure 401s are handled
      await apiClient.post('/api/auth/refresh');
      
      // Dispatch success to clear UI warnings
      window.dispatchEvent(new CustomEvent('session-refresh'));
      return true;
    } catch (error) {
      console.error('Session refresh failed', error);
      // Logic for transition to expired phase if failure occurs
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { staySignedIn, isRefreshing };
};
