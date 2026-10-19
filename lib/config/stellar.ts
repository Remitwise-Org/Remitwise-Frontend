// Stellar network configuration
export const STELLAR_CONFIG = {
  network: process.env.STELLAR_NETWORK || 'testnet',
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
  contractId: process.env.REMITTANCE_SPLIT_CONTRACT_ID || '',
  custodialMode: process.env.CUSTODIAL_MODE === 'true',
  serverSecretKey: process.env.SERVER_SECRET_KEY || '',
  explorerTxUrl: process.env.STELLAR_EXPLORER_TX_URL || 'https://stellar.expert/explorer/public/tx/',
};

export const CONTRACTS = {
  remittanceSplit: {
    testnet: process.env.REMITTANCE_SPLIT_CONTRACT_ID || 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    mainnet: process.env.REMITTANCE_SPLIT_CONTRACT_ID || 'CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  }
};
