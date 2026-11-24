import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockLogDebug = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

vi.mock('@/lib/logger', () => ({
  logDebug: mockLogDebug,
  logError: mockLogError,
}));

import { POST } from '@/app/api/csp-report/route';

function makeRequest(body: unknown, contentType = 'application/csp-report') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://localhost/api/csp-report', {
    method: 'POST',
    headers: {
      'content-type': contentType,
      'content-length': String(Buffer.byteLength(text)),
    },
    body: text,
  });
}

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts and logs a legacy CSP report', async () => {
    const response = await POST(
      makeRequest({
        'csp-report': {
          'document-uri': 'https://app.example.com/dashboard',
          'effective-directive': 'style-src-elem',
          'blocked-uri': 'inline',
          disposition: 'report',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(mockLogDebug).toHaveBeenCalledWith(
      'CSP violation report',
      expect.objectContaining({
        type: 'csp-violation',
        effectiveDirective: 'style-src-elem',
        blockedURL: 'inline',
      }),
    );
  });

  it('accepts Reporting API JSON reports', async () => {
    const response = await POST(
      makeRequest(
        [
          {
            type: 'csp-violation',
            url: 'https://app.example.com/',
            body: {
              effectiveDirective: 'script-src-elem',
              blockedURL: 'https://cdn.example.com/app.js',
              disposition: 'report',
            },
          },
        ],
        'application/reports+json',
      ),
    );

    expect(response.status).toBe(204);
  });

  it('rejects unsupported content types', async () => {
    const response = await POST(makeRequest({}, 'text/plain'));
    expect(response.status).toBe(415);
  });

  it('rejects oversized and unknown-directive reports', async () => {
    const oversized = await POST(makeRequest('x'.repeat(8193)));
    expect(oversized.status).toBe(413);

    const unknown = await POST(
      makeRequest({
        'csp-report': {
          'effective-directive': 'unknown-directive',
        },
      }),
    );
    expect(unknown.status).toBe(204);
  });
});
