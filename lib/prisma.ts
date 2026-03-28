// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string | undefined {
  const urlString = process.env.DATABASE_URL;
  if (!urlString) return undefined;
  try {
    const url = new URL(urlString);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '10');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '5');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '5');
    }
    return url.toString();
  } catch (e) {
    return urlString;
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;