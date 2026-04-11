import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log("[prisma.ts] Initializing Prisma Client");
console.log("[prisma.ts] DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("[prisma.ts] DATABASE_URL_UNPOOLED exists:", !!process.env.DATABASE_URL_UNPOOLED);
console.log("[prisma.ts] NODE_ENV:", process.env.NODE_ENV);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

console.log("[prisma.ts] Prisma Client initialized successfully");

if (process.env.NODE_ENV === "development") globalForPrisma.prisma = prisma;
