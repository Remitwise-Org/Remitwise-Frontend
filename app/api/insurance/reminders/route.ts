import { requireAuth } from '../../../../lib/session';
import { getRemindersForWallet } from '../../../../lib/insurance';

export const dynamic = 'force-dynamic';

/**
 * GET /api/insurance/reminders (protected)
 * Returns policies where nextPaymentDate is within the next 7 days or overdue.
 * Data can come from contract getActivePolicies (filtered) or getOverduePolicies,
 * or from DB when reminders are stored for push/email.
 */
export async function GET() {
  let auth: { address: string };
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const reminders = getRemindersForWallet(auth.address);
  return Response.json(reminders);
}
