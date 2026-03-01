// tests/unit/health-service.test.ts
// Unit tests for HealthService using dependency injection

import { describe, it, expect, beforeEach } from 'vitest';
import { HealthService } from '@/lib/services/health-service';
import { createTestContainer, ServiceContainer } from '@/lib/di/container';
import { createMockDbClient, createMockSorobanClient } from '@/lib/di/factories';

describe('HealthService', () => {
  let container: ServiceContainer;
  let healthService: HealthService;
  let mockDb: any;
  let mockSoroban: any;

  beforeEach(() => {
    // Create isolated test container
    container = createTestContainer();
    
    // Create mock clients
    mockDb = createMockDbClient();
    mockSoroban = createMockSorobanClient();
    
    // Inject mocks into container
    container.setDb(mockDb);
    container.setSoroban(mockSoroban);
    
    // Create service with injected dependencies
    healthService = new HealthService(container);
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy when database query succeeds', async () => {
      const result = await healthService.checkDatabaseHealth();
      
      expect(result.reachable).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when database query fails', async () => {
      mockDb.setShouldFail(true);
      
      const result = await healthService.checkDatabaseHealth();
      
      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Database query failed');
      expect(result.responseTime).toBe(5000); // timeout value
    });

    it('should timeout after specified duration', async () => {
      // Mock database that never resolves
      const slowMockDb = createMockDbClient();
      slowMockDb.$queryRaw = () => new Promise(() => {}); // Never resolves
      container.setDb(slowMockDb);
      
      const result = await healthService.checkDatabaseHealth(100); // 100ms timeout
      
      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Database health check timeout');
      expect(result.responseTime).toBe(100);
    });
  });

  describe('checkSorobanHealth', () => {
    it('should return healthy when Soroban client succeeds', async () => {
      const result = await healthService.checkSorobanHealth();
      
      expect(result.reachable).toBe(true);
      expect(result.latestLedger).toBe(12345);
      expect(result.protocolVersion).toBe(20);
      expect(result.networkPassphrase).toBe('Test SDF Network ; September 2015');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy when Soroban client fails', async () => {
      mockSoroban.setShouldFail(true);
      
      const result = await healthService.checkSorobanHealth();
      
      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Network unreachable');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should use custom ledger sequence', async () => {
      mockSoroban.setLedgerSequence(99999);
      
      const result = await healthService.checkSorobanHealth();
      
      expect(result.latestLedger).toBe(99999);
    });
  });

  describe('getOverallHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      const result = await healthService.getOverallHealth();
      
      expect(result.status).toBe('ok');
      expect(result.database.reachable).toBe(true);
      expect(result.soroban.reachable).toBe(true);
      expect(result.anchor.reachable).toBe(true);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockDb.setShouldFail(true);
      
      const result = await healthService.getOverallHealth();
      
      expect(result.status).toBe('degraded');
      expect(result.database.reachable).toBe(false);
      expect(result.soroban.reachable).toBe(true);
      expect(result.anchor.reachable).toBe(true);
    });

    it('should return degraded status when Soroban is unhealthy', async () => {
      mockSoroban.setShouldFail(true);
      
      const result = await healthService.getOverallHealth();
      
      expect(result.status).toBe('degraded');
      expect(result.database.reachable).toBe(true);
      expect(result.soroban.reachable).toBe(false);
      expect(result.anchor.reachable).toBe(true);
    });

    it('should return degraded status when both services are unhealthy', async () => {
      mockDb.setShouldFail(true);
      mockSoroban.setShouldFail(true);
      
      const result = await healthService.getOverallHealth();
      
      expect(result.status).toBe('degraded');
      expect(result.database.reachable).toBe(false);
      expect(result.soroban.reachable).toBe(false);
      expect(result.anchor.reachable).toBe(true);
    });
  });

  describe('createHealthResponse', () => {
    it('should create NextResponse with correct status code', () => {
      const healthData = {
        status: 'ok',
        database: { reachable: true },
        soroban: { reachable: true },
        anchor: { reachable: true },
        timestamp: '2024-02-24T10:30:00Z',
      };
      
      const response = healthService.createHealthResponse(healthData, 200);
      
      expect(response.status).toBe(200);
      // Note: NextResponse.json() creates a Response object, not easily testable for body
      // In a real test environment, you might need to use response.json() to get the body
    });

    it('should create error response with 503 status', () => {
      const healthData = {
        status: 'degraded',
        database: { reachable: false },
        soroban: { reachable: false },
        anchor: { reachable: false },
        timestamp: '2024-02-24T10:30:00Z',
      };
      
      const response = healthService.createHealthResponse(healthData, 503);
      
      expect(response.status).toBe(503);
    });
  });
});
