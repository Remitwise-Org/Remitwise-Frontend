import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import { prisma } from '@/lib/prisma';
import {
  getResolvedContractIds,
  getSorobanNetwork,
} from '@/lib/contracts/network-resolution';
import { probeAnchor } from '@/lib/health/anchor-probe';

/**
 * Health check endpoint for monitoring system status and connectivity.
 * GET /api/health (rewritten to /api/v1/health)
 */
export async function GET() {
  const network = getSorobanNetwork();
  const includeContractDetails =
    process.env.NODE_ENV !== 'production' ||
    process.env.HEALTH_INCLUDE_CONTRACT_IDS === 'true';

  const results = {
    status: 'ok',
    database: 'ok' as 'ok' | 'error',
    rpc: 'ok' as 'ok' | 'error',
    anchor: 'skipped' as 'ok' | 'error' | 'skipped',
    network,
    contractIds: includeContractDetails ? getResolvedContractIds() : undefined,
  };

  let criticalFailure = false;

  // 1. Database Check
  try {
    // Run a simple query to ensure connectivity
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);
  } catch (error) {
    console.error('[Health Check] Database connectivity error:', error);
    results.database = 'error';
    criticalFailure = true;
  }

  // 2. Soroban RPC Check
  try {
    // Use configured RPC URL or default to public testnet
    const rpcUrl = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 
                   process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 
                   'https://soroban-testnet.stellar.org';
    
    // Ping the RPC server
    const server = new StellarSdk.SorobanRpc.Server(rpcUrl);
    await server.getLatestLedger();
  } catch (error) {
    console.error('[Health Check] Soroban RPC connectivity error:', error);
    results.rpc = 'error';
    criticalFailure = true;
  }

  // 3. Anchor Platform Check (Optional)
  // Shared probe so this route and the legacy /api/health agree by construction.
  // Mapped onto this route's existing string contract (not_configured ->
  // 'skipped'), so behavior here is unchanged. Anchor stays non-critical.
  const anchorProbe = await probeAnchor();
  if (anchorProbe.status === 'ok') {
    results.anchor = 'ok';
  } else if (anchorProbe.status === 'not_configured') {
    results.anchor = 'skipped';
  } else {
    results.anchor = 'error';
    if (anchorProbe.httpStatus !== undefined) {
      console.warn(`[Health Check] Anchor Platform returned status ${anchorProbe.httpStatus}`);
    } else {
      console.error('[Health Check] Anchor Platform connectivity error:', anchorProbe.error);
    }
    // Anchor is optional, so we don't set criticalFailure = true
  }

  // Determine final status
  if (criticalFailure) {
    results.status = 'unhealthy';
    return NextResponse.json(results, { status: 503 });
  }

  return NextResponse.json(results, { status: 200 });
}
