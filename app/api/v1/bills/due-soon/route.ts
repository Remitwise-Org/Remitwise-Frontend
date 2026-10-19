import { requireAuth } from '@/lib/session';
import { getBillsDueSoon } from '@/lib/bills-reminders';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bills/due-soon (protected)
 * Polling-based reminders: reads unpaid bills and filters those due within 7 days.
 */
export async function GET() {
  let auth: { address: string };
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const reminders = await getBillsDueSoon(auth.address);
  return Response.json(reminders);
}
