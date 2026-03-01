// lib/services/health-service.ts
// Health check service using dependency injection

import { NextResponse } from "next/server";
import { ServiceContainer, DatabaseHealthResult, SorobanHealthResult } from "../types/clients";
import { SorobanClientError } from "../soroban/client";

export class HealthService {
  constructor(private container: ServiceContainer) {}

  async checkDatabaseHealth(timeoutMs = 5000): Promise<DatabaseHealthResult> {
    const startTime = Date.now();
    
    try {
      const db = this.container.getDb();
      
      // Fast health check with timeout
      const healthPromise = db.$queryRaw`SELECT 1 as health_check`;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database health check timeout')), timeoutMs)
      );
      
      await Promise.race([healthPromise, timeoutPromise]);
      
      return {
        reachable: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        reachable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: timeoutMs,
      };
    }
  }

  async checkSorobanHealth(): Promise<SorobanHealthResult> {
    const startTime = Date.now();
    
    try {
      const soroban = this.container.getSoroban();
      const ledger = await soroban.getLatestLedger();
      
      return {
        reachable: true,
        latestLedger: ledger.sequence,
        protocolVersion: Number(ledger.protocolVersion),
        networkPassphrase: soroban.getNetworkPassphrase(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        reachable: false,
        error:
          error instanceof SorobanClientError
            ? error.message
            : "Unexpected error contacting Soroban RPC",
        responseTime: Date.now() - startTime,
      };
    }
  }

  async getOverallHealth() {
    // Check all dependencies
    const [database, soroban] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkSorobanHealth(),
    ]);

    // Anchor placeholder - would be implemented with real HTTP probe
    const anchor = { reachable: true };

    // Determine overall health
    const healthy = database.reachable && soroban.reachable;

    return {
      status: healthy ? "ok" : "degraded",
      database,
      soroban,
      anchor,
      timestamp: new Date().toISOString(),
    };
  }

  createHealthResponse(healthData: any, statusCode: number = 200) {
    return NextResponse.json(healthData, { status: statusCode });
  }
}
