import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  pool: pg.Pool | undefined;
  prisma: PrismaClient | undefined;
};

export function getPool(): pg.Pool {
  if (!globalForPrisma.pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL no está definida");
    }
    globalForPrisma.pool = new pg.Pool({ connectionString: url });
  }
  return globalForPrisma.pool;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(getPool()),
    });
  }
  return globalForPrisma.prisma;
}
