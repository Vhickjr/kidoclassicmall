import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

// Next.js hot-reloads modules in development, which would otherwise open a new
// pool on every save until the database refuses connections. Stash client and
// pool on globalThis and reuse them across module reloads.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: mariadb.Pool;
};

/** The driver takes a config object rather than a URL when you need to tune the
 *  pool, so the connection string is split into its parts. */
function parseMariaDbUrl(url: string) {
  const parsed = new URL(url);

  // MySQL 8's caching_sha2_password needs either TLS or the server's RSA public
  // key to complete a full handshake. A local dev container has neither, and
  // its auth cache empties every time the container restarts — which is what
  // turns the whole site into pool timeouts the morning after.
  //
  // Only ever relaxed for a database on this machine. Fetching a key over a
  // plaintext link to a remote host would be a genuine interception risk, so
  // production keeps the strict behaviour.
  const host = parsed.hostname;
  const isLocal =
    host === "127.0.0.1" || host === "localhost" || host === "::1";

  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ...(isLocal ? { allowPublicKeyRetrieval: true } : {}),
  };
}

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Locally, copy .env.example to .env. On Hostinger, set it in the panel's environment variables."
    );
  }

  const mariadbUrl = databaseUrl.replace(/^mysql:\/\//, "mariadb://");

  if (!globalForPrisma.pool) {
    // Hostinger's shared MySQL allows 500 connections per hour per user, which
    // an unconfigured pool exhausts quickly: it opens up to ten and recycles
    // them on a short idle timer, and every recycle spends another connection
    // from the hourly budget.
    //
    // So: keep very few, and hold them open rather than reopening. A single
    // boutique's traffic does not need more, and a reused connection costs
    // nothing against the cap.
    globalForPrisma.pool = mariadb.createPool({
      // `mariadb://` is not a scheme the driver's own config parser accepts,
      // but it is what the adapter expects, so the URL is passed through here.
      connectionLimit: 15,
      // Thirty minutes: long enough that a quiet period does not churn the pool.
      idleTimeout: 1800,
      // Allow requests to wait up to 30s during massive concurrent traffic spikes
      acquireTimeout: 30_000,
      // Verify a pooled connection is still alive before handing it out, so a
      // server-side timeout surfaces as a retry rather than a failed request.
      minimumIdle: 1,
      ...parseMariaDbUrl(mariadbUrl),
    });
  }

  globalForPrisma.prisma = new PrismaClient({
    adapter: new PrismaMariaDb(globalForPrisma.pool),
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

  return globalForPrisma.prisma;
}

