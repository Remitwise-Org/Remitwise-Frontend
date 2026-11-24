import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { cookies as cookiesImport } from 'next/headers';
import { GET } from '@/app/api/remittance/recurring/[id]/runs/route';
import { createSession } from '@/lib/session';
import prisma from '@/lib/db';
import { processDueRecurringRemittances } from '@/lib/remittance/recurring-runner';
import { recurringStore } from '@/lib/remittance/recurring-store';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const cookies = vi.mocked(cookiesImport) as any;

const userAddress = 'GBPABUP5J7BKR3QYCPGX6JV5L6TBLIZZIODF5RA634K6U4NBLLHC5WNU';
const otherUserAddress = 'GCHQA7EYYL7TKLR7N6CRWTEWE45AUDQZMVATZX6VTHRIHB5W2M7R2R34';
const recipientAddress = 'GDNZCYDH24SG4RWKTCGIH75KCGSYFXOQVPMSC7S6I2E66C2PHFNKE3LM';
const dueAt = new Date('2026-01-31T10:00:00.000Z');

let ownerSession: string;
let otherSession: string;

function mockCookieStore(sessionToken?: string) {
  cookies.mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) =>
      name === 'remitwise_session' && sessionToken
        ? { value: sessionToken }
        : undefined,
    ),
  });
}

function request(scheduleId: string) {
  return new NextRequest(
    `http://localhost/api/remittance/recurring/${scheduleId}/runs`,
  );
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function createSchedule() {
  const schedule = await recurringStore.create({
    userAddress,
    recipientAddress,
    amount: 125,
    currency: 'USDC',
    frequency: 'monthly',
  });
  await prisma.recurringRemittance.update({
    where: { id: schedule.id },
    data: { nextRunAt: dueAt },
  });
  return schedule;
}

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.SESSION_PASSWORD = 'test-password-at-least-32-characters-long';
  process.env.SESSION_MAX_AGE = '604800';
  await recurringStore.clear();
  ownerSession = (await createSession(userAddress)).sealed;
  otherSession = (await createSession(otherUserAddress)).sealed;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/remittance/recurring/[id]/runs', () => {
  it('rejects unauthenticated requests', async () => {
    mockCookieStore();

    const response = await GET(request('missing'), context('missing'));

    expect(response.status).toBe(401);
  });

  it('returns 404 for an unknown schedule', async () => {
    mockCookieStore(ownerSession);

    const response = await GET(request('missing'), context('missing'));

    expect(response.status).toBe(404);
  });

  it('prevents a different user from reading the schedule runs', async () => {
    const schedule = await createSchedule();
    mockCookieStore(otherSession);

    const response = await GET(request(schedule.id), context(schedule.id));

    expect(response.status).toBe(403);
  });

  it('returns the owner\'s persisted pending run as an unsigned snapshot', async () => {
    const schedule = await createSchedule();
    const results = await Promise.all([
      processDueRecurringRemittances({ now: dueAt }),
      processDueRecurringRemittances({ now: dueAt }),
    ]);
    mockCookieStore(ownerSession);

    const response = await GET(request(schedule.id), context(schedule.id));
    const body = await response.json();

    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(1);
    expect(results.reduce((sum, result) => sum + result.failed, 0)).toBe(0);
    expect(response.status).toBe(200);
    expect(body.runs).toEqual([
      {
        id: expect.any(String),
        scheduleId: schedule.id,
        dueAt: dueAt.toISOString(),
        status: 'pending',
        createdAt: expect.any(String),
        unsignedRemittance: {
          recipientAddress,
          amount: 125,
          currency: 'USDC',
        },
      },
    ]);
  });
});
