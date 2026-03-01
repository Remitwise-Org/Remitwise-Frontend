// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Pooling and timeouts configuration
// - For serverless (e.g., Vercel), keep pool small to avoid exhausting DB connections
//   via connection string env vars (see README):
//   - connection_limit (max pool size), pool_timeout (ms), connect_timeout (ms)
// - PrismaClient built-in config:
//   - log: keep minimal to reduce overhead
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

// Helper to run queries with a timeout to avoid long hangs
export async function withQueryTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;