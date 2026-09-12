import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Next.js reads .env on its own, but the Prisma CLI does not. Load it here so
// `prisma migrate` sees the same credentials the app does.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
    // `migrate dev` builds a throwaway copy of the schema to diff against, and
    // it normally does that by creating a database. A shared host will not grant
    // CREATE DATABASE, so point this at a second, empty database you made yourself.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
