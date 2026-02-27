import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, getAdminIdentity } from '@/lib/admin/auth';
import { clearRegisteredCaches, listRegisteredCaches } from '@/lib/cache/registry';
import { recordAuditEvent } from '@/lib/admin/audit';
import '@/lib/auth-cache';
import '@/lib/anchor/rates-cache';

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const availableCaches = listRegisteredCaches();
  const clearedCaches = await clearRegisteredCaches();
  const actor = getAdminIdentity(request);

  recordAuditEvent({
    type: 'admin.cache.clear',
    actor,
    message: 'Cleared in-memory caches',
    metadata: { availableCaches, clearedCaches },
  });

  return NextResponse.json({
    ok: true,
    clearedCaches,
  });
}

