// Deprecated duplicate Prisma client setup replaced with a single shared instance.
// Re-export the singleton Prisma client from lib/prisma to avoid multiple pools.
import { prisma } from "./prisma";
export default prisma;
