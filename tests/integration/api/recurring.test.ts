import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { cookies as cookiesImport } from 'next/headers';
import { POST, GET } from '@/app/api/remittance/recurring/route';
import { PATCH, DELETE } from '@/app/api/remittance/recurring/[id]/route';
import { recurringStore } from '@/lib/remittance/recurring-store';
import { createSession } from '@/lib/session';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const cookies = vi.mocked(cookiesImport) as any;

describe('Recurring Remittance API Integration Tests', () => {
  const userA = 'GAYEIL5YGIDGXV527LIVL7E4GMUQCDDNNZNKQ7HE4EEAOV2ZVMZRETWP';
  const userB = 'GCSE4CBGKLI6SHRCXS33BC2BNHYV3G4LKEMTFY6YNNMM5Y5CN7YX3TPJ';
  const recipient = 'GBHSX43CSCNRVUKIE6C34DK5O75UT3CIXVAAFDLJRQYKG7KD7X3PY24Z';

  let sessionA: string;
  let sessionB: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
    process.env.SESSION_MAX_AGE = '604800'; // 7 days

    await recurringStore.clear();

    sessionA = await createSession(userA);
    sessionB = await createSession(userB);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Unauthenticated Requests (401)', () => {
    beforeEach(() => {
      // Simulate no session cookie
      cookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      });
    });

    it('POST /api/remittance/recurring should return 401', async () => {
      const req = new NextRequest('http://localhost/api/remittance/recurring', {
        method: 'POST',
        body: JSON.stringify({
          recipientAddress: recipient,
          amount: 100,
          currency: 'USD',
          frequency: 'weekly',
        }),
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it('GET /api/remittance/recurring should return 401', async () => {
      const req = new NextRequest('http://localhost/api/remittance/recurring', {
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });

    it('PATCH /api/remittance/recurring/[id] should return 401', async () => {
      const req = new NextRequest('http://localhost/api/remittance/recurring/some-id', {
        method: 'PATCH',
        body: JSON.stringify({ amount: 150 }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: 'some-id' }) });
      expect(response.status).toBe(401);
    });

    it('DELETE /api/remittance/recurring/[id] should return 401', async () => {
      const req = new NextRequest('http://localhost/api/remittance/recurring/some-id', {
        method: 'DELETE',
      });

      const response = await DELETE(req, { params: Promise.resolve({ id: 'some-id' }) });
      expect(response.status).toBe(401);
    });
  });

  describe('Authenticated Operations', () => {
    const mockCookieStore = (sessionToken: string) => {
      cookies.mockResolvedValue({
        get: vi.fn().mockImplementation((name) => {
          if (name === 'remitwise_session') {
            return { value: sessionToken };
          }
          return undefined;
        }),
      });
    };

    describe('Creation (POST) and Validation (400)', () => {
      beforeEach(() => {
        mockCookieStore(sessionA);
      });

      it('should create a valid recurring remittance schedule', async () => {
        const req = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 100,
            currency: 'USD',
            frequency: 'weekly',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.id).toBeDefined();
        expect(data.userAddress).toBe(userA);
        expect(data.recipientAddress).toBe(recipient);
        expect(data.amount).toBe(100);
        expect(data.currency).toBe('USD');
        expect(data.frequency).toBe('weekly');
      });

      it('should return 400 for invalid recipient address format', async () => {
        const req = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: 'invalid-address',
            amount: 100,
            currency: 'USD',
            frequency: 'weekly',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
      });

      it('should return 400 for negative/zero amount', async () => {
        const req = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 0,
            currency: 'USD',
            frequency: 'weekly',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
      });

      it('should return 400 for invalid frequency', async () => {
        const req = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 100,
            currency: 'USD',
            frequency: 'yearly',
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
      });

      it('should return 400 for missing fields', async () => {
        const req = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 100,
          }),
        });

        const response = await POST(req);
        expect(response.status).toBe(400);
      });
    });

    describe('Listing (GET)', () => {
      it('should return only the schedules belonging to the caller', async () => {
        // Create schedule for User A
        mockCookieStore(sessionA);
        const reqCreateA = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 50,
            currency: 'XLM',
            frequency: 'monthly',
          }),
        });
        await POST(reqCreateA);

        // Create schedule for User B
        mockCookieStore(sessionB);
        const reqCreateB = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 75,
            currency: 'USDC',
            frequency: 'biweekly',
          }),
        });
        await POST(reqCreateB);

        // User A lists schedules
        mockCookieStore(sessionA);
        const reqListA = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'GET',
        });
        const resListA = await GET(reqListA);
        expect(resListA.status).toBe(200);
        const dataA = await resListA.json();
        expect(dataA.length).toBe(1);
        expect(dataA[0].userAddress).toBe(userA);
        expect(dataA[0].amount).toBe(50);

        // User B lists schedules
        mockCookieStore(sessionB);
        const reqListB = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'GET',
        });
        const resListB = await GET(reqListB);
        expect(resListB.status).toBe(200);
        const dataB = await resListB.json();
        expect(dataB.length).toBe(1);
        expect(dataB[0].userAddress).toBe(userB);
        expect(dataB[0].amount).toBe(75);
      });
    });

    describe('Updating (PATCH) & Ownership (403/404)', () => {
      let scheduleId: string;

      beforeEach(async () => {
        // Create a schedule for User A
        mockCookieStore(sessionA);
        const reqCreate = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 100,
            currency: 'USD',
            frequency: 'weekly',
          }),
        });
        const res = await POST(reqCreate);
        const data = await res.json();
        scheduleId = data.id;
      });

      it('should allow owner (User A) to update their own schedule', async () => {
        mockCookieStore(sessionA);
        const reqUpdate = new NextRequest(`http://localhost/api/remittance/recurring/${scheduleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            amount: 250,
            frequency: 'monthly',
          }),
        });

        const response = await PATCH(reqUpdate, { params: Promise.resolve({ id: scheduleId }) });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.amount).toBe(250);
        expect(data.frequency).toBe('monthly');
      });

      it('should return 403 Forbidden when User B tries to update User A\'s schedule', async () => {
        mockCookieStore(sessionB);
        const reqUpdate = new NextRequest(`http://localhost/api/remittance/recurring/${scheduleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            amount: 500,
          }),
        });

        const response = await PATCH(reqUpdate, { params: Promise.resolve({ id: scheduleId }) });
        expect(response.status).toBe(403);
      });

      it('should return 404 Not Found when updating a nonexistent schedule', async () => {
        mockCookieStore(sessionA);
        const reqUpdate = new NextRequest('http://localhost/api/remittance/recurring/nonexistent-id', {
          method: 'PATCH',
          body: JSON.stringify({
            amount: 500,
          }),
        });

        const response = await PATCH(reqUpdate, { params: Promise.resolve({ id: 'nonexistent-id' }) });
        expect(response.status).toBe(404);
      });

      it('should return 400 Bad Request for validation failures on update fields', async () => {
        mockCookieStore(sessionA);
        const reqUpdate = new NextRequest(`http://localhost/api/remittance/recurring/${scheduleId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            amount: -10,
          }),
        });

        const response = await PATCH(reqUpdate, { params: Promise.resolve({ id: scheduleId }) });
        expect(response.status).toBe(400);
      });
    });

    describe('Deletion (DELETE) & Ownership (403/404)', () => {
      let scheduleId: string;

      beforeEach(async () => {
        // Create a schedule for User A
        mockCookieStore(sessionA);
        const reqCreate = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'POST',
          body: JSON.stringify({
            recipientAddress: recipient,
            amount: 100,
            currency: 'USD',
            frequency: 'weekly',
          }),
        });
        const res = await POST(reqCreate);
        const data = await res.json();
        scheduleId = data.id;
      });

      it('should allow owner (User A) to delete their own schedule', async () => {
        mockCookieStore(sessionA);
        const reqDelete = new NextRequest(`http://localhost/api/remittance/recurring/${scheduleId}`, {
          method: 'DELETE',
        });

        const response = await DELETE(reqDelete, { params: Promise.resolve({ id: scheduleId }) });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify it is deleted
        const reqGet = new NextRequest('http://localhost/api/remittance/recurring', {
          method: 'GET',
        });
        const resGet = await GET(reqGet);
        const listData = await resGet.json();
        expect(listData.length).toBe(0);
      });

      it('should return 403 Forbidden when User B tries to delete User A\'s schedule', async () => {
        mockCookieStore(sessionB);
        const reqDelete = new NextRequest(`http://localhost/api/remittance/recurring/${scheduleId}`, {
          method: 'DELETE',
        });

        const response = await DELETE(reqDelete, { params: Promise.resolve({ id: scheduleId }) });
        expect(response.status).toBe(403);
      });

      it('should return 404 Not Found when deleting a nonexistent schedule', async () => {
        mockCookieStore(sessionA);
        const reqDelete = new NextRequest('http://localhost/api/remittance/recurring/nonexistent-id', {
          method: 'DELETE',
        });

        const response = await DELETE(reqDelete, { params: Promise.resolve({ id: 'nonexistent-id' }) });
        expect(response.status).toBe(404);
      });
    });
  });
});
