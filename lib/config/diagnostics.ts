/**
 * Diagnostics Configuration & Helper Utilities
 * Centralized resolution of build info, feature flags, wallet chain, and request tracking.
 */

import { getSorobanNetwork } from "@/lib/contracts/network-resolution";
import { DEV_MODE_LATEST_REQUEST_ID_KEY } from "@/lib/config/developer";

/** Current Git Commit SHA or release identifier */
export const BUILD_SHA =
  process.env.NEXT_PUBLIC_BUILD_SHA ||
  process.env.BUILD_SHA ||
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "development";

/** Default fallback wallet chain derived from network configuration */
export function getDefaultWalletChain(): string {
  try {
    return getSorobanNetwork();
  } catch {
    return (
      process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
      process.env.STELLAR_NETWORK ||
      process.env.SOROBAN_NETWORK ||
      "testnet"
    ).toLowerCase();
  }
}

export interface FeatureFlags {
  custodialMode: boolean;
  developerMode: boolean;
  sentryMonitoring: boolean;
  recurringRemittance: boolean;
  emergencyTransfer: boolean;
  familyWallet: boolean;
  insurance: boolean;
  savingsGoals: boolean;
  splitTransactions: boolean;
}

/**
 * Returns current status of system feature flags.
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    custodialMode:
      process.env.NEXT_PUBLIC_CUSTODIAL_MODE === "true" ||
      process.env.CUSTODIAL_MODE === "true",
    developerMode: process.env.NEXT_PUBLIC_DEV_MODE === "true",
    sentryMonitoring: Boolean(
      process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
    ),
    recurringRemittance:
      process.env.NEXT_PUBLIC_FEATURE_RECURRING_REMITTANCE !== "false",
    emergencyTransfer:
      process.env.NEXT_PUBLIC_FEATURE_EMERGENCY_TRANSFER !== "false",
    familyWallet:
      process.env.NEXT_PUBLIC_FEATURE_FAMILY_WALLET !== "false",
    insurance: process.env.NEXT_PUBLIC_FEATURE_INSURANCE !== "false",
    savingsGoals:
      process.env.NEXT_PUBLIC_FEATURE_SAVINGS_GOALS !== "false",
    splitTransactions:
      process.env.NEXT_PUBLIC_FEATURE_SPLIT_TRANSACTIONS !== "false",
  };
}

export interface DiagnosticsSnapshot {
  buildSha: string;
  featureFlags: FeatureFlags;
  walletChain: string;
  lastRequestId: string;
}

/**
 * Formats a diagnostics snapshot object with runtime fallbacks.
 */
export function getDiagnosticsSnapshot(options?: {
  activeNetwork?: string | null;
  lastRequestId?: string | null;
}): DiagnosticsSnapshot {
  return {
    buildSha: BUILD_SHA,
    featureFlags: getFeatureFlags(),
    walletChain: options?.activeNetwork || getDefaultWalletChain(),
    lastRequestId: options?.lastRequestId || "None",
  };
}
