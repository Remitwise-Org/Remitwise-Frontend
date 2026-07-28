'use client';

import { useState, useCallback } from 'react';

type CopyStatus = 'idle' | 'copied' | 'error';

/**
 * A hook to copy text to the clipboard.
 * @param text The text to copy.
 * @returns An object with the copy function and the current copy status.
 */
export function useCopyToClipboard() {
  const [status, setStatus] = useState<CopyStatus>('idle');

  const copy = useCallback(async (text: string) => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported');
      setStatus('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      // Reset status after a short delay
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Failed to copy text: ', error);
      setStatus('error');
      const timer = setTimeout(() => setStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return { copy, status };
}