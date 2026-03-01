/**
 * app/api/health/route.ts
 *
 * GET /api/health
 *
 * Returns 200 when all critical dependencies are healthy, 503 otherwise.
 * Response always includes: status, database, soroban, anchor, timestamp.
 */

import { NextResponse } from "next/server";
import { container, initializeProductionServices } from "@/lib/di/container";
import { HealthService } from "@/lib/services/health-service";

export const runtime = "nodejs";

// Initialize production services if not in test environment
if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
  // Only initialize if not already done
  try {
    container.getDb();
  } catch {
    // Database not initialized, set up production services
    const { prisma } = require("@/lib/prisma");
    const { createProductionDbClient } = require("@/lib/di/db-factory");
    const { createProductionSorobanClient } = require("@/lib/di/soroban-factory");
    
    container.setDb(createProductionDbClient(prisma));
    container.setSoroban(createProductionSorobanClient());
  }
}

export async function GET() {
  const healthService = new HealthService(container);
  
  try {
    const healthData = await healthService.getOverallHealth();
    const healthy = healthData.database.reachable && healthData.soroban.reachable;
    
    return healthService.createHealthResponse(healthData, healthy ? 200 : 503);
  } catch (error) {
    // Fallback health response if service fails
    return NextResponse.json(
      {
        status: "degraded",
        database: { reachable: false, error: "Health service initialization failed" },
        soroban: { reachable: false, error: "Health service initialization failed" },
        anchor: { reachable: false, error: "Health service initialization failed" },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}