// Test setup file
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Set up test environment variables
  process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_SAVINGS_GOALS_CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
});
