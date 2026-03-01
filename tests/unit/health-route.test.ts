// tests/unit/health-route.test.ts
// Unit tests for health route using dependency injection

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/health/route';
import { container, createTestContainer } from '@/lib/di/container';
import { createMockDbClient, createMockSorobanClient } from '@/lib/di/factories';

// Mock the container to avoid production initialization
vi.mock('@/lib/di/container', async () => {
  const actual = await vi.importActual('@/lib/di/container');
  return {
    ...actual,
    container: actual.createTestContainer(), // Use test container by default
  };
});

describe('Health Route', () => {
  let mockDb: any;
  let mockSoroban: any;

  beforeEach(() => {
    // Reset container and inject fresh mocks
    container.reset();
    
    mockDb = createMockDbClient();
    mockSoroban = createMockSorobanClient();
    
    container.setDb(mockDb);
    container.setSoroban(mockSoroban);
  });

  it('should return 200 when all services are healthy', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database.reachable).toBe(true);
    expect(data.soroban.reachable).toBe(true);
    expect(data.anchor.reachable).toBe(true);
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return 503 when database is unhealthy', async () => {
    mockDb.setShouldFail(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database.reachable).toBe(false);
    expect(data.soroban.reachable).toBe(true);
    expect(data.anchor.reachable).toBe(true);
  });

  it('should return 503 when Soroban is unhealthy', async () => {
    mockSoroban.setShouldFail(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database.reachable).toBe(true);
    expect(data.soroban.reachable).toBe(false);
    expect(data.anchor.reachable).toBe(true);
  });

  it('should return 503 when both services are unhealthy', async () => {
    mockDb.setShouldFail(true);
    mockSoroban.setShouldFail(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database.reachable).toBe(false);
    expect(data.soroban.reachable).toBe(false);
    expect(data.anchor.reachable).toBe(true);
  });

  it('should include Soroban network details when healthy', async () => {
    mockSoroban.setLedgerSequence(99999);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.soroban.latestLedger).toBe(99999);
    expect(data.soroban.protocolVersion).toBe(20);
    expect(data.soroban.networkPassphrase).toBe('Test SDF Network ; September 2015');
  });

  it('should handle service initialization failure gracefully', async () => {
    // Break the container to simulate initialization failure
    container.reset(); // Don't set any services

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.database.reachable).toBe(false);
    expect(data.database.error).toBe('Health service initialization failed');
    expect(data.soroban.reachable).toBe(false);
    expect(data.soroban.error).toBe('Health service initialization failed');
  });
});
