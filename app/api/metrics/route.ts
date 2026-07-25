import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '../../../middleware';
import { isAdminAuthorized, getAdminIdentity } from '@/lib/admin/auth';
import { recordAuditEvent } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actor = getAdminIdentity(request);
  recordAuditEvent({
    type: 'admin.metrics.read',
    actor,
    message: 'Accessed in-memory metrics',
  });

  return NextResponse.json(metrics);
}
