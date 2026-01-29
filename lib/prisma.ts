import { PrismaClient } from '@prisma/client';

/**
 * Prisma 客户端单例
 * 确保在整个应用中只存在一个数据库连接实例
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
