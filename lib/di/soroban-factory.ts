// lib/di/soroban-factory.ts
// Factory for creating Soroban client implementations

import { SorobanClient, SorobanLedgerResponse } from '../types/clients';
import { getServer, getNetworkPassphrase, getLatestLedger } from '../soroban/client';
import { SorobanClientError } from '../soroban/client';

export class ProductionSorobanClient implements SorobanClient {
  getNetworkPassphrase(): string {
    return getNetworkPassphrase();
  }

  async getLatestLedger(): Promise<SorobanLedgerResponse> {
    const ledger = await getLatestLedger();
    return {
      sequence: ledger.sequence,
      timestamp: Date.now(), // Use current time since timestamp might not be in response
      protocolVersion: Number(ledger.protocolVersion),
    };
  }

  async getLedgerSequence(): Promise<number> {
    const ledger = await getLatestLedger();
    return ledger.sequence;
  }

  async getContractData(contractId: string, key: string, ledgerSequence?: number): Promise<any> {
    const server = getServer();
    // Implementation would depend on specific contract data needs
    throw new Error('getContractData not implemented in production client');
  }

  async simulateTransaction(transaction: any): Promise<any> {
    const server = getServer();
    // Implementation would depend on transaction simulation needs
    throw new Error('simulateTransaction not implemented in production client');
  }

  async sendTransaction(transaction: any): Promise<any> {
    const server = getServer();
    // Implementation would depend on transaction sending needs
    throw new Error('sendTransaction not implemented in production client');
  }

  getServer(): any {
    return getServer();
  }
}

export function createProductionSorobanClient(): SorobanClient {
  return new ProductionSorobanClient();
}

// Mock implementation for testing
export class MockSorobanClient implements SorobanClient {
  private networkPassphrase: string;
  private ledgerSequence: number;
  private shouldFail: boolean;

  constructor(config: {
    networkPassphrase?: string;
    ledgerSequence?: number;
    shouldFail?: boolean;
  } = {}) {
    this.networkPassphrase = config.networkPassphrase ?? 'Test SDF Network ; September 2015';
    this.ledgerSequence = config.ledgerSequence ?? 12345;
    this.shouldFail = config.shouldFail ?? false;
  }

  getNetworkPassphrase(): string {
    if (this.shouldFail) {
      throw new SorobanClientError('Network unreachable');
    }
    return this.networkPassphrase;
  }

  async getLatestLedger(): Promise<SorobanLedgerResponse> {
    if (this.shouldFail) {
      throw new SorobanClientError('Failed to fetch latest ledger');
    }
    return {
      sequence: this.ledgerSequence,
      timestamp: Date.now(),
      protocolVersion: 20,
    };
  }

  async getLedgerSequence(): Promise<number> {
    if (this.shouldFail) {
      throw new SorobanClientError('Failed to get ledger sequence');
    }
    return this.ledgerSequence;
  }

  async getContractData(contractId: string, key: string, ledgerSequence?: number): Promise<any> {
    if (this.shouldFail) {
      throw new SorobanClientError('Contract data fetch failed');
    }
    return { key: `mock_data_for_${key}`, value: 'mock_value' };
  }

  async simulateTransaction(transaction: any): Promise<any> {
    if (this.shouldFail) {
      throw new SorobanClientError('Transaction simulation failed');
    }
    return {
      transactionData: transaction,
      result: { success: true },
      cost: { cpu: 1000, memory: 500 },
    };
  }

  async sendTransaction(transaction: any): Promise<any> {
    if (this.shouldFail) {
      throw new SorobanClientError('Transaction send failed');
    }
    return {
      hash: 'mock_transaction_hash',
      status: 'SUCCESS',
      ledger: this.ledgerSequence + 1,
    };
  }

  getServer(): any {
    return {
      getLatestLedger: () => this.getLatestLedger(),
      simulateTransaction: (tx: any) => this.simulateTransaction(tx),
      sendTransaction: (tx: any) => this.sendTransaction(tx),
    };
  }

  // Test utility methods
  setLedgerSequence(sequence: number): void {
    this.ledgerSequence = sequence;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}

export function createMockSorobanClient(config?: {
  networkPassphrase?: string;
  ledgerSequence?: number;
  shouldFail?: boolean;
}): SorobanClient {
  return new MockSorobanClient(config);
}
