// lib/db-serverless.ts
// Serverless-optimized database configuration for Vercel/Next.js

import { PrismaClient } from '@prisma/client';

// Global singleton pattern for serverless environments
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client with serverless optimizations
const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    
    // For SQLite, we configure connection behavior rather than traditional pooling
    // SQLite doesn't support connection pooling like PostgreSQL
  });

  // Configure SQLite for serverless use
  if (process.env.DATABASE_URL?.includes('sqlite')) {
    // Set SQLite pragmas for better performance in serverless
    client.$queryRaw`PRAGMA journal_mode = WAL;`.catch(() => {});
    client.$queryRaw`PRAGMA synchronous = NORMAL;`.catch(() => {});
    client.$queryRaw`PRAGMA cache_size = 10000;`.catch(() => {});
    client.$queryRaw`PRAGMA temp_store = memory;`.catch(() => {});
    
    // Set busy timeout to prevent hanging
    client.$queryRaw`PRAGMA busy_timeout = 5000;`.catch(() => {});
  }

  return client;
};

// Use existing client if available (warm start) or create new one
const prisma = globalThis.__prisma ?? createPrismaClient();

// Prevent creating new clients on hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown helper for serverless
export const disconnectDatabase = async () => {
  if (globalThis.__prisma) {
    await globalThis.__prisma.$disconnect();
    globalThis.__prisma = undefined;
  }
};

// Health check with timeout
export const checkDatabaseHealth = async (timeoutMs = 5000) => {
  const startTime = Date.now();
  
  try {
    const healthPromise = prisma.$queryRaw`SELECT 1 as health_check`;
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Database health check timeout')), timeoutMs)
    );
    
    await Promise.race([healthPromise, timeoutPromise]);
    
    return {
      reachable: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: timeoutMs,
    };
  }
};

export { prisma };
export default prisma;
