// lib/di/container.ts
// Dependency injection container for testable services

import { ServiceContainer, DbClient, SorobanClient } from '../types/clients';

class Container implements ServiceContainer {
  private db: DbClient | null = null;
  private soroban: SorobanClient | null = null;

  getDb(): DbClient {
    if (!this.db) {
      throw new Error('Database client not initialized. Call setDb() first.');
    }
    return this.db;
  }

  getSoroban(): SorobanClient {
    if (!this.soroban) {
      throw new Error('Soroban client not initialized. Call setSoroban() first.');
    }
    return this.soroban;
  }

  setDb(db: DbClient): void {
    this.db = db;
  }

  setSoroban(soroban: SorobanClient): void {
    this.soroban = soroban;
  }

  // Reset for test isolation
  reset(): void {
    this.db = null;
    this.soroban = null;
  }
}

// Global container instance
export const container = new Container();

// Test utilities
export function createTestContainer(): ServiceContainer {
  return new Container();
}

// Environment detection
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

// Production initialization
export function initializeProductionServices(): void {
  if (isTestEnvironment()) {
    throw new Error('Cannot initialize production services in test environment');
  }

  // Initialize real implementations
  const { prisma } = require('../prisma');
  const { createProductionSorobanClient } = require('./soroban-factory');
  
  container.setDb(prisma);
  container.setSoroban(createProductionSorobanClient());
}
