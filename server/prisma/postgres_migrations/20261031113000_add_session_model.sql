-- ==============================================================================
-- THE ROYAL KNOT — POSTGRESQL PRODUCTION MIGRATION
-- Migration: 20261031113000_add_session_model.sql
-- Target: PostgreSQL (Neon / Supabase / AWS RDS / GCP Cloud SQL)
--
-- Deployment Instructions:
-- 1. DO NOT execute SQLite migrations on PostgreSQL.
-- 2. Execute this script using psql or your migration pipeline:
--    psql "$DATABASE_URL" -f server/prisma/postgres_migrations/20261031113000_add_session_model.sql
-- 3. Alternatively, deploy via Prisma with PostgreSQL datasource configured:
--    npx prisma migrate deploy --schema=./prisma/schema.postgres.prisma
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "csrfTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indices for high-performance session lookup and expiration cleanup
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");
