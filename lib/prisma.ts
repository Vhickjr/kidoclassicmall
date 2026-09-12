import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
  );
}

// Prisma's migrate engine and every MySQL tool speak mysql://, but the mariadb
// driver behind the adapter parses mariadb:// and nothing else. Keep one
// mysql:// URL in the environment and swap the scheme for the driver here.
const connectionString = databaseUrl.replace(/^mysql:\/\//, "mariadb://");

// Next.js hot-reloads modules in development, which would otherwise open a new
// pool on every save until the database refuses connections. Stash one client
// on globalThis and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
