import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { auditLog, createAuditEvent, extractIp, AuditAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  // Get user address before clearing session
  let address: string | undefined;
  try {
    const session = await getSession();
    address = session?.address;
  } catch {
    // Session not found or expired
  }

  const cookieStore = await cookies();
  cookieStore.delete('session');
  
  // Log logout event
  await auditLog(
    createAuditEvent(AuditAction.LOGOUT, 'success', {
      address,
      ip: extractIp(request),
    })
  );
  
  return NextResponse.json({ success: true });
}
