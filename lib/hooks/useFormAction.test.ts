import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormAction } from './useFormAction';
import { apiClient } from '@/lib/client/apiClient';

type TestState = {
  error?: string;
  success?: string;
  validationErrors?: Array<{ path: string; message: string }>;
  policyName?: string;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function createHookHarness() {
  let captured:
    | readonly [TestState, (formData: FormData) => void, boolean]
    | undefined;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container) as Root;

  function TestComponent() {
    const hook = useFormAction<TestState>('/api/test');
    captured = hook;
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    get hook() {
      return captured!;
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useFormAction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('updates state with a successful response payload', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: 'Policy created',
          policyName: 'Health Plan',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const harness = createHookHarness();

    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({
        success: 'Policy created',
        policyName: 'Health Plan',
      });
    } finally {
      harness.unmount();
    }
  });

  it('surfaces a typed server error body for 4xx responses', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Policy name is required',
          },
        }),
        {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const harness = createHookHarness();

    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({
        error: 'Policy name is required',
      });
    } finally {
      harness.unmount();
    }
  });

  it('surfaces a typed server error body for 5xx responses', async () => {
    vi.spyOn(apiClient, 'request').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Service unavailable',
          },
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const harness = createHookHarness();

    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({
        error: 'Service unavailable',
      });
    } finally {
      harness.unmount();
    }
  });

  it('falls back to a network error message when the request fails', async () => {
    vi.spyOn(apiClient, 'request').mockRejectedValueOnce(new Error('offline'));

    const harness = createHookHarness();

    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({
        error: 'Network error. Please try again.',
      });
    } finally {
      harness.unmount();
    }
  });

  it('aborts the previous request when the form is submitted again quickly', async () => {
    const abortSpy = vi.fn();
    let resolveFirst: ((value: Response) => void) | undefined;

    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    vi.spyOn(apiClient, 'request')
      .mockImplementationOnce((url, options) => {
        const signal = options?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => abortSpy());
        return firstRequest;
      })
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: 'Second submission succeeded' }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const harness = createHookHarness();

    try {
      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      await act(async () => {
        harness.hook[1](new FormData());
        await flushPromises();
      });

      expect(abortSpy).toHaveBeenCalled();

      act(() => {
        resolveFirst?.(
          new Response(
            JSON.stringify({ success: 'First submission succeeded' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      });

      await act(async () => {
        await flushPromises();
      });

      expect(harness.hook[0]).toMatchObject({
        success: 'Second submission succeeded',
      });
    } finally {
      harness.unmount();
    }
  });
});
