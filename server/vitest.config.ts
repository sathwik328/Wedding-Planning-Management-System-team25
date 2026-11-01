import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

// Ensure test environment defaults if not provided in environment
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";
process.env.DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || "RoyalKnot#LocalDev2026";

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: "node"
  }
});
