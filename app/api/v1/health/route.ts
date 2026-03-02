import { NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';
import prisma from '@/lib/db';

/**
 * Health check endpoint for monitoring system status and connectivity.
 * GET /api/health (rewritten to /api/v1/health)
 */
export async function GET() {
  const results = {
    status: 'ok',
    database: 'ok' as 'ok' | 'error',
    rpc: 'ok' as 'ok' | 'error',
    anchor: 'skipped' as 'ok' | 'error' | 'skipped',
  };

  let criticalFailure = false;

  // 1. Database Check
  try {
    // Run a simple query to ensure connectivity
    await prisma.$queryRaw`SELECT 1`;
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
  const anchorUrl = process.env.ANCHOR_PLATFORM_URL;
  if (anchorUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      // Ping the standard Anchor info endpoint
      const res = await fetch(`${anchorUrl}/info`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        results.anchor = 'ok';
      } else {
        console.warn(`[Health Check] Anchor Platform returned status ${res.status}`);
        results.anchor = 'error';
      }
    } catch (error) {
      console.error('[Health Check] Anchor Platform connectivity error:', error);
      results.anchor = 'error';
      // Anchor is optional, so we don't set criticalFailure = true
    }
  }

  // Determine final status
  if (criticalFailure) {
    results.status = 'unhealthy';
    return NextResponse.json(results, { status: 503 });
  }

  return NextResponse.json(results, { status: 200 });
}
