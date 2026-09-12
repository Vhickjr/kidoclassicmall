import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Next.js hot-reloads modules in development, which would otherwise open a new
// pool on every save until the database refuses connections. Stash one client
// on globalThis and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Built on first use rather than on import. `next build` imports every page
 * module to read its route config, so anything demanded at module scope becomes
 * a build-time requirement — and the build host has no database credentials.
 * Nothing here runs until a request actually needs to query.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Locally, copy .env.example to .env. On Hostinger, set it in the panel's environment variables."
    );
  }

  // Prisma's migrate engine and every MySQL tool speak mysql://, but the mariadb
  // driver behind the adapter parses mariadb:// and nothing else. Keep one
  // mysql:// URL in the environment and swap the scheme for the driver here.
  globalForPrisma.prisma = new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl.replace(/^mysql:\/\//, "mariadb://")),
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

  return globalForPrisma.prisma;
}
