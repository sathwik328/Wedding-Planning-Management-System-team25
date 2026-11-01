import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const serverDir = path.resolve(__dirname, "..");
const schemaPrismaPath = path.resolve(serverDir, "prisma/schema.prisma");
const schemaPostgresPath = path.resolve(serverDir, "prisma/schema.postgres.prisma");

console.log("-----------------------------------------");
console.log("The Royal Knot: Database Initialization");
console.log("-----------------------------------------");

if (isPostgres) {
  console.log("[DB] PostgreSQL connection detected.");
  if (fs.existsSync(schemaPostgresPath)) {
    let content = fs.readFileSync(schemaPostgresPath, "utf-8");
    content = content.replace('url      = env("POSTGRES_DATABASE_URL")', 'url      = env("DATABASE_URL")');
    fs.writeFileSync(schemaPrismaPath, content, "utf-8");
    console.log("[DB] Synchronized PostgreSQL schema to schema.prisma");
  }

  try {
    console.log("[DB] Generating Prisma Client for PostgreSQL...");
    execSync("npx prisma generate --schema=./prisma/schema.prisma", {
      cwd: serverDir,
      stdio: "inherit"
    });

    console.log("[DB] Syncing schema to PostgreSQL...");
    execSync("npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss", {
      cwd: serverDir,
      stdio: "inherit"
    });
    console.log("[DB] PostgreSQL schema ready.");

    console.log("[DB] Seeding demo database accounts...");
    try {
      execSync("npx tsx prisma/seed.ts", {
        cwd: serverDir,
        env: {
          ...process.env,
          ALLOW_DEMO_SEED: "true",
          DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD || "RoyalKnot#LocalDev2026"
        },
        stdio: "inherit"
      });
      console.log("[DB] Demo database accounts successfully seeded.");
    } catch (seedErr) {
      console.warn("[DB] Non-critical warning during seed:", seedErr?.message || seedErr);
    }
  } catch (err) {
    console.error("[DB] Note during PostgreSQL initialization:", err?.message || err);
    throw err;
  }
} else {
  console.log("[DB] SQLite database active.");
  try {
    execSync("npx prisma generate --schema=./prisma/schema.prisma", {
      cwd: serverDir,
      stdio: "inherit"
    });
    execSync("npx prisma db push --schema=./prisma/schema.prisma", {
      cwd: serverDir,
      stdio: "inherit"
    });
  } catch (err) {
    console.warn("[DB] Note during SQLite initialization:", err?.message || err);
  }
}
console.log("-----------------------------------------");
