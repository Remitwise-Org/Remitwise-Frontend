import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { cookies as cookiesImport } from 'next/headers';
import { GET as CALCULATE_GET } from '@/app/api/split/calculate/route';
import { POST as INITIALIZE_POST } from '@/app/api/split/initialize/route';
import { POST as UPDATE_POST } from '@/app/api/split/update/route';
import { createSession } from '@/lib/session';
import { calculateSplit, buildInitializeSplitTx, buildUpdateSplitTx } from '@/lib/contracts/remittance-split';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock contract calls
vi.mock('@/lib/contracts/remittance-split', () => ({
  calculateSplit: vi.fn(),
  buildInitializeSplitTx: vi.fn(),
  buildUpdateSplitTx: vi.fn(),
}));

const cookies = vi.mocked(cookiesImport) as any;

describe('Split Routes API Integration Tests', () => {
  const validPublicKey = 'GBPABUP5J7BKR3QYCPGX6JV5L6TBLIZZIODF5RA634K6U4NBLLHC5WNU';
  const invalidChecksumPublicKey = 'GBPABUP5J7BKR3QYCPGX6JV5L6TBLIZZIODF5RA634K6U4NBLLHC5WNN';
  let sessionToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    sessionToken = await createSession(validPublicKey);

    vi.mocked(calculateSplit).mockResolvedValue({
      savings: '30',
      bills: '15',
      insurance: '5',
      family: '50',
      remainder: '0',
    });
    vi.mocked(buildInitializeSplitTx).mockResolvedValue({
      xdr: 'mock-initialize-xdr',
      simulate: { estimatedFee: '100' },
    });
    vi.mocked(buildUpdateSplitTx).mockResolvedValue({
      xdr: 'mock-update-xdr',
      simulate: { estimatedFee: '100' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCookieStore = (token?: string) => {
    cookies.mockResolvedValue({
      get: vi.fn().mockImplementation((name) => {
        if (name === 'remitwise_session' && token) {
          return { value: token };
        }
        return undefined;
      }),
    });
  };

  describe('GET /api/split/calculate', () => {
    it('returns 401 for unauthenticated request', async () => {
      mockCookieStore(undefined);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=100');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid session address', async () => {
      const badSessionToken = await createSession(invalidChecksumPublicKey);
      mockCookieStore(badSessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=100');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('calculates splits for valid amount', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=100');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.amounts).toBeDefined();
      expect(body.amounts.savings).toBe('30');
      expect(body.amounts.bills).toBe('15');
      expect(body.amounts.insurance).toBe('5');
    });

    it('returns 400 for negative amount', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=-100');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('positive');
    });

    it('returns 400 for non-integer string amount', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=100.5');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid string amount', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=abc');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing amount', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for extra query parameters', async () => {
      mockCookieStore(sessionToken);
      const req = new NextRequest('http://localhost/api/split/calculate?amount=100&extra=field');
      const res = await CALCULATE_GET(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/split/initialize', () => {
    it('returns 401 for unauthenticated request', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 5 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid session address', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': invalidChecksumPublicKey,
        },
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 5 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
    });

    it('returns transaction XDR for valid percentages', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 5 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.xdr).toBeDefined();
    });

    it('returns 400 when percentages do not sum to 100', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 10 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('sum to 100');
    });

    it('returns 400 for negative percentages', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: -50, savings: 130, bills: 15, insurance: 5 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing fields', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 50, savings: 30, bills: 20 }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for extra fields', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 5, extra: 'field' }),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for empty body', async () => {
      const req = new NextRequest('http://localhost/api/split/initialize', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({}),
      });
      const res = await INITIALIZE_POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/split/update', () => {
    it('returns 401 for unauthenticated request', async () => {
      const req = new NextRequest('http://localhost/api/split/update', {
        method: 'POST',
        body: JSON.stringify({ spending: 50, savings: 30, bills: 15, insurance: 5 }),
      });
      const res = await UPDATE_POST(req);
      expect(res.status).toBe(401);
    });

    it('returns transaction XDR for valid percentages', async () => {
      const req = new NextRequest('http://localhost/api/split/update', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 40, savings: 40, bills: 15, insurance: 5 }),
      });
      const res = await UPDATE_POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.xdr).toBeDefined();
    });

    it('returns 400 when percentages do not sum to 100', async () => {
      const req = new NextRequest('http://localhost/api/split/update', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 40, savings: 40, bills: 15, insurance: 10 }),
      });
      const res = await UPDATE_POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for extra fields', async () => {
      const req = new NextRequest('http://localhost/api/split/update', {
        method: 'POST',
        headers: {
          'x-stellar-public-key': validPublicKey,
        },
        body: JSON.stringify({ spending: 40, savings: 40, bills: 15, insurance: 5, extra: 'field' }),
      });
      const res = await UPDATE_POST(req);
      expect(res.status).toBe(400);
    });
  });
});
