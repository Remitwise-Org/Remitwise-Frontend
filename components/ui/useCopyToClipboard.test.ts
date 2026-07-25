import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopyToClipboard } from '@/lib/hooks/useCopyToClipboard';

const writeText = vi.fn();

Object.assign(navigator, {
  clipboard: {
    writeText,
  },
});

describe('hooks/useCopyToClipboard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return a copy function and idle status initially', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(typeof result.current.copy).toBe('function');
    expect(result.current.status).toBe('idle');
  });

  it('should copy text to clipboard and update status to "copied"', async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    const textToCopy = 'hello world';

    await act(async () => {
      await result.current.copy(textToCopy);
    });

    expect(writeText).toHaveBeenCalledWith(textToCopy);
    expect(result.current.status).toBe('copied');
  });

  it('should set status to "error" on failure', async () => {
    writeText.mockRejectedValueOnce(new Error('Copy failed'));
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => { await result.current.copy('test'); });
    expect(result.current.status).toBe('error');
  });
});