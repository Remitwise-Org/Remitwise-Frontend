// Offline transaction signing utility for React Native (TypeScript)
import { ethers } from 'ethers';

export async function signTransactionOffline(txData: object, privateKey: string): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  const tx = await wallet.signTransaction(txData);
  return tx;
}
