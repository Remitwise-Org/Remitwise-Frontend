import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiError } from '@/lib/auth';
import { getSplit } from '@/lib/contracts/remittance-split-cached';
import { auditLog, createAuditEvent, extractIp, AuditAction } from '@/lib/audit';

async function getHandler(request: NextRequest, session: string) {
  try {
    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const config = await getSplit(env);
    
    if (!config) {
      throw new ApiError(404, 'Split configuration not found');
    }
    
    // Log split configuration read
    await auditLog(
      createAuditEvent(AuditAction.SPLIT_GET, 'success', {
        address: session,
        ip: extractIp(request),
      })
    );
    
    return NextResponse.json({
      percentages: {
        savings: config.savings_percent,
        bills: config.bills_percent,
        insurance: config.insurance_percent,
        family: config.family_percent
      }
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to fetch split config');
  }
}

async function postHandler(request: NextRequest, session: string) {
  const body = await request.json();
  
  // Log split configuration update
  await auditLog(
    createAuditEvent(AuditAction.SPLIT_UPDATE, 'success', {
      address: session,
      ip: extractIp(request),
      metadata: {
        savings: body.savings,
        bills: body.bills,
        insurance: body.insurance,
        family: body.family,
      },
    })
  );
  
  // TODO: Call Soroban remittance_split contract to update config
  return NextResponse.json({ success: true });
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
