import { requireAuth } from '../../../../lib/session';
import { getRemindersForWallet } from '../../../../lib/insurance';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/insurance/reminders (protected)
 * Returns policies where nextPaymentDate is within the next 7 days or overdue.
 * Data can come from contract getActivePolicies (filtered) or getOverduePolicies,
 * or from DB when reminders are stored for push/email.
 */
export const GET = withApiLogger(async () => {
  let auth: { address: string };
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const reminders = getRemindersForWallet(auth.address);
  return Response.json(reminders);
});
