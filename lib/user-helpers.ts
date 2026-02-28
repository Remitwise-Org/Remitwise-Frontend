/**
 * User helper utilities for querying and managing users
 * Includes soft-delete aware query helpers
 */

import { prisma } from '@/lib/prisma';

/**
 * Get active user by stellar address (excludes deactivated users)
 * @param address - Stellar wallet address
 * @param includePreferences - Whether to include user preferences
 * @returns User object or null if not found or deactivated
 */
export async function getActiveUser(
  address: string,
  includePreferences: boolean = false
) {
  return prisma.user.findFirst({
    where: {
      stellar_address: address,
      deletedAt: null, // Only active users
    },
    include: includePreferences ? { preferences: true } : undefined,
  });
}

/**
 * Get all active users (excludes deactivated users)
 * @param includePreferences - Whether to include user preferences
 * @returns Array of active users
 */
export async function getActiveUsers(includePreferences: boolean = false) {
  return prisma.user.findMany({
    where: {
      deletedAt: null, // Only active users
    },
    include: includePreferences ? { preferences: true } : undefined,
  });
}

/**
 * Count active users (excludes deactivated users)
 * @returns Count of active users
 */
export async function countActiveUsers() {
  return prisma.user.count({
    where: {
      deletedAt: null, // Only active users
    },
  });
}

/**
 * Check if a user is deactivated
 * @param address - Stellar wallet address
 * @returns true if user is deactivated, false otherwise
 */
export async function isUserDeactivated(address: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { stellar_address: address },
    select: { deletedAt: true },
  });
  return user?.deletedAt !== null && user?.deletedAt !== undefined;
}

/**
 * Get deactivated users that are past retention period
 * Used for automated purge jobs
 * @param retentionDays - Number of days to retain deactivated users (default: 90)
 * @returns Array of users eligible for purge
 */
export async function getUsersEligibleForPurge(retentionDays: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  return prisma.user.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate, // Deactivated before cutoff date
      },
    },
  });
}

/**
 * Admin function: Get user including deactivated status
 * Should only be used in admin contexts
 * @param address - Stellar wallet address
 * @param includePreferences - Whether to include user preferences
 * @returns User object or null if not found
 */
export async function getUserIncludingDeactivated(
  address: string,
  includePreferences: boolean = false
) {
  return prisma.user.findUnique({
    where: { stellar_address: address },
    include: includePreferences ? { preferences: true } : undefined,
  });
}

/**
 * Admin function: Reactivate a deactivated user
 * Sets deletedAt to null
 * @param address - Stellar wallet address
 * @returns Updated user object
 */
export async function reactivateUser(address: string) {
  return prisma.user.update({
    where: { stellar_address: address },
    data: { deletedAt: null },
  });
}
