import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { getAuditEvents } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitRaw = request.nextUrl.searchParams.get('limit');
  const parsed = Number(limitRaw ?? 50);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 200) : 50;

  return NextResponse.json({
    events: getAuditEvents(limit),
  });
}

