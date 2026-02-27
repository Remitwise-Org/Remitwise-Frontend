/**
 * Audit Logging Types
 * 
 * Defines the structure and types for audit events in RemitWise.
 * All sensitive operations should be logged using these types.
 */

/**
 * Enum of all auditable actions in the system
 */
export enum AuditAction {
  // Authentication
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAIL = 'LOGIN_FAIL',
  LOGOUT = 'LOGOUT',
  NONCE_REQUESTED = 'NONCE_REQUESTED',
  
  // Remittance
  REMITTANCE_BUILD = 'REMITTANCE_BUILD',
  REMITTANCE_EMERGENCY = 'REMITTANCE_EMERGENCY',
  REMITTANCE_STATUS_CHECK = 'REMITTANCE_STATUS_CHECK',
  
  // Split Configuration
  SPLIT_INITIALIZE = 'SPLIT_INITIALIZE',
  SPLIT_UPDATE = 'SPLIT_UPDATE',
  SPLIT_GET = 'SPLIT_GET',
  
  // Savings Goals
  GOAL_CREATE = 'GOAL_CREATE',
  GOAL_ADD_FUNDS = 'GOAL_ADD_FUNDS',
  GOAL_WITHDRAW = 'GOAL_WITHDRAW',
  GOAL_LOCK = 'GOAL_LOCK',
  GOAL_UNLOCK = 'GOAL_UNLOCK',
  GOAL_LIST = 'GOAL_LIST',
  
  // Bills
  BILL_CREATE = 'BILL_CREATE',
  BILL_PAY = 'BILL_PAY',
  BILL_UPDATE = 'BILL_UPDATE',
  BILL_DELETE = 'BILL_DELETE',
  
  // Insurance
  POLICY_CREATE = 'POLICY_CREATE',
  PREMIUM_PAY = 'PREMIUM_PAY',
  POLICY_UPDATE = 'POLICY_UPDATE',
  POLICY_CANCEL = 'POLICY_CANCEL',
  
  // Family Wallet
  FAMILY_MEMBER_ADD = 'FAMILY_MEMBER_ADD',
  FAMILY_MEMBER_UPDATE = 'FAMILY_MEMBER_UPDATE',
  FAMILY_MEMBER_REMOVE = 'FAMILY_MEMBER_REMOVE',
  FAMILY_LIMIT_CHANGE = 'FAMILY_LIMIT_CHANGE',
}

/**
 * Result of an audit event
 */
export type AuditResult = 'success' | 'failure';

/**
 * Core audit event structure
 */
export interface AuditEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** The action being audited */
  action: AuditAction;
  
  /** Stellar public key of the user (optional for anonymous actions) */
  address?: string;
  
  /** Client IP address */
  ip?: string;
  
  /** Resource ID being acted upon (e.g., goal ID, bill ID) */
  resource?: string;
  
  /** Success or failure */
  result: AuditResult;
  
  /** Error message (sanitized, no secrets) */
  error?: string;
  
  /** Additional context (sanitized) */
  metadata?: Record<string, any>;
}

/**
 * Configuration for audit logging
 */
export interface AuditConfig {
  enabled: boolean;
  destination: 'stdout' | 'database';
  retentionDays?: number;
  includeMetadata?: boolean;
}
