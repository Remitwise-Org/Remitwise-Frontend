// Stellar network configuration
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
