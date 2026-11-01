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

    console.log("[DB] Seeding demonstration data...");
    execSync("npm run prisma:seed", {
      cwd: serverDir,
      stdio: "inherit"
    });
    console.log("[DB] PostgreSQL setup completed successfully.");
  } catch (err) {
    console.error("[DB] Note during PostgreSQL initialization:", err?.message || err);
  }
} else {
  console.log("[DB] SQLite database active.");
}
console.log("-----------------------------------------");
