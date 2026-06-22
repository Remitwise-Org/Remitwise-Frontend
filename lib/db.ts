// lib/db.ts — re-exports the canonical Prisma client from lib/prisma.ts
// This module is kept for backward compatibility. New code should import
// directly from '@/lib/prisma'.
export { prisma as default } from './prisma';
