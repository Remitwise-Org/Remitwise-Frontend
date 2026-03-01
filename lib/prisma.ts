// lib/prisma.ts
// Re-export serverless-optimized database client

export { prisma, disconnectDatabase, checkDatabaseHealth } from './db-serverless';
export { prisma as default } from './db-serverless';