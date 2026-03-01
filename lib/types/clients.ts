// lib/types/clients.ts
// Interface definitions for dependency injection

export interface DbClient {
  // Basic query operations
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T>;
  
  // Health check
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  
  // Transaction operations
  $transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  
  // Model operations (simplified for DI)
  user: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
  };
  userPreference: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
  };
}

export interface SorobanClient {
  // Network information
  getNetworkPassphrase(): string;
  getLatestLedger(): Promise<SorobanLedgerResponse>;
  getLedgerSequence(): Promise<number>;
  
  // Contract operations
  getContractData(contractId: string, key: string, ledgerSequence?: number): Promise<any>;
  simulateTransaction(transaction: any): Promise<any>;
  sendTransaction(transaction: any): Promise<any>;
  
  // Server management
  getServer(): any; // SorobanRpc.Server
}

export interface SorobanLedgerResponse {
  sequence: number;
  timestamp: number;
  protocolVersion: number | string;
}

// Service container interface
export interface ServiceContainer {
  getDb(): DbClient;
  getSoroban(): SorobanClient;
  setDb(db: DbClient): void;
  setSoroban(soroban: SorobanClient): void;
}

// Health check interfaces
export interface HealthCheckResult {
  reachable: boolean;
  responseTime?: number;
  error?: string;
}

export interface DatabaseHealthResult extends HealthCheckResult {}

export interface SorobanHealthResult extends HealthCheckResult {
  latestLedger?: number;
  protocolVersion?: number;
  networkPassphrase?: string;
}
