// Stellar network configuration
//
// Environment variables read by this module (see .env.example):
//   STELLAR_NETWORK             - 'testnet' | 'mainnet'. Default: 'testnet'. Optional.
//   STELLAR_NETWORK_PASSPHRASE  - Network passphrase. Default: 'Test SDF Network ; September 2015'. Optional.
//   STELLAR_HORIZON_URL         - Horizon API base URL. Default: 'https://horizon-testnet.stellar.org'. Optional.
//   CUSTODIAL_MODE              - Set to 'true' to enable custodial mode. Default: disabled. Optional.
//   SERVER_SECRET_KEY           - Server Stellar secret key. Default: ''. Required when CUSTODIAL_MODE=true. Secret: never commit.
//   STELLAR_EXPLORER_TX_URL     - Block explorer transaction URL prefix. Default: 'https://stellar.expert/explorer/public/tx/'. Optional.
//   REMITTANCE_SPLIT contract ID is resolved via resolveContractId (see lib/contracts/network-resolution.ts).

import { resolveContractId } from '../contracts/network-resolution';

export const STELLAR_CONFIG = {
  network: process.env.STELLAR_NETWORK || 'testnet',
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  get contractId() {
    return resolveContractId('REMITTANCE_SPLIT');
  },
  custodialMode: process.env.CUSTODIAL_MODE === 'true',
  serverSecretKey: process.env.SERVER_SECRET_KEY || '',
  explorerTxUrl: process.env.STELLAR_EXPLORER_TX_URL || 'https://stellar.expert/explorer/public/tx/',
};

export const CONTRACTS = {
  remittanceSplit: {
    get testnet() {
      return resolveContractId('REMITTANCE_SPLIT', 'testnet');
    },
    get mainnet() {
      return resolveContractId('REMITTANCE_SPLIT', 'mainnet');
    },
  }
};
