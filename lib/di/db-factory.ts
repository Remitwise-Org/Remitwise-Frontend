// lib/di/db-factory.ts
// Factory for creating database client implementations

import { DbClient } from '../types/clients';

export class ProductionDbClient implements DbClient {
  private prisma: any;

  constructor(prismaClient: any) {
    this.prisma = prismaClient;
  }

  async $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    return this.prisma.$queryRaw<T>(query, ...values);
  }

  async $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T> {
    return this.prisma.$queryRawUnsafe<T>(query, ...values);
  }

  async $connect(): Promise<void> {
    return this.prisma.$connect();
  }

  async $disconnect(): Promise<void> {
    return this.prisma.$disconnect();
  }

  async $transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction<T>((tx: any) => fn(new ProductionDbClient(tx)));
  }

  get user() {
    return this.prisma.user;
  }

  get userPreference() {
    return this.prisma.userPreference;
  }
}

export function createProductionDbClient(prismaClient: any): DbClient {
  return new ProductionDbClient(prismaClient);
}

// Mock implementation for testing
export class MockDbClient implements DbClient {
  private users: any[] = [];
  private userPreferences: any[] = [];
  private shouldFail: boolean = false;
  private nextId: number = 1;

  constructor(config: { shouldFail?: boolean } = {}) {
    this.shouldFail = config.shouldFail ?? false;
  }

  async $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    if (this.shouldFail) {
      throw new Error('Database query failed');
    }
    
    // Handle health check queries
    const queryString = query.join('');
    if (queryString.includes('SELECT 1') || queryString.includes('health_check')) {
      return [{ health_check: 1 }] as T;
    }
    
    return [] as T;
  }

  async $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T> {
    if (this.shouldFail) {
      throw new Error('Database query failed');
    }
    return [] as T;
  }

  async $connect(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Database connection failed');
    }
  }

  async $disconnect(): Promise<void> {
    // No-op for mock
  }

  async $transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    // Simple mock transaction - just execute the function
    return fn(this);
  }

  get user() {
    return {
      findUnique: async (args: any) => {
        if (this.shouldFail) throw new Error('User find failed');
        return this.users.find(u => u.id === args.where.id || u.stellar_address === args.where.stellar_address);
      },
      create: async (args: any) => {
        if (this.shouldFail) throw new Error('User creation failed');
        const user = { ...args.data, id: `user_${this.nextId++}`, createdAt: new Date(), updatedAt: new Date() };
        this.users.push(user);
        return user;
      },
      update: async (args: any) => {
        if (this.shouldFail) throw new Error('User update failed');
        const user = this.users.find(u => u.id === args.where.id);
        if (user) {
          Object.assign(user, args.data, { updatedAt: new Date() });
        }
        return user;
      },
      delete: async (args: any) => {
        if (this.shouldFail) throw new Error('User deletion failed');
        const index = this.users.findIndex(u => u.id === args.where.id);
        if (index >= 0) {
          return this.users.splice(index, 1)[0];
        }
        return null;
      },
      findMany: async (args: any) => {
        if (this.shouldFail) throw new Error('User find many failed');
        return this.users;
      },
    };
  }

  get userPreference() {
    return {
      findUnique: async (args: any) => {
        if (this.shouldFail) throw new Error('UserPreference find failed');
        return this.userPreferences.find(p => p.id === args.where.id || p.userId === args.where.userId);
      },
      create: async (args: any) => {
        if (this.shouldFail) throw new Error('UserPreference creation failed');
        const pref = { ...args.data, id: `pref_${this.nextId++}` };
        this.userPreferences.push(pref);
        return pref;
      },
      update: async (args: any) => {
        if (this.shouldFail) throw new Error('UserPreference update failed');
        const pref = this.userPreferences.find(p => p.id === args.where.id);
        if (pref) {
          Object.assign(pref, args.data);
        }
        return pref;
      },
      delete: async (args: any) => {
        if (this.shouldFail) throw new Error('UserPreference deletion failed');
        const index = this.userPreferences.findIndex(p => p.id === args.where.id);
        if (index >= 0) {
          return this.userPreferences.splice(index, 1)[0];
        }
        return null;
      },
      findMany: async (args: any) => {
        if (this.shouldFail) throw new Error('UserPreference find many failed');
        return this.userPreferences;
      },
    };
  }

  // Test utility methods
  addUser(user: any): void {
    this.users.push({ ...user, id: `user_${this.nextId++}`, createdAt: new Date(), updatedAt: new Date() });
  }

  addUserPreference(pref: any): void {
    this.userPreferences.push({ ...pref, id: `pref_${this.nextId++}` });
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  reset(): void {
    this.users = [];
    this.userPreferences = [];
    this.nextId = 1;
    this.shouldFail = false;
  }
}

export function createMockDbClient(config?: { shouldFail?: boolean }): DbClient {
  return new MockDbClient(config);
}
