import express, { Express } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { bigIntSerializationMiddleware } from "./middleware/bigIntSerializer.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createCrmRouter } from "./routes/crm.routes.js";
import { createAgreementRouter } from "./routes/agreement.routes.js";
import { createWeddingOpsRouter } from "./routes/weddingOps.routes.js";
import { createDayOfOpsRouter } from "./routes/dayOfOps.routes.js";
import { createDevBRouter } from "./routes/devB.routes.js";

export function createApp(prisma: PrismaClient): Express {
  const app = express();

  // Deliberately configure proxy trust for safe IP extraction behind reverse proxies
  app.set("trust proxy", 1);

  // Configured CORS with credentials support (replaces wildcard CORS)
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"]
    })
  );

  app.use(express.json());

  // Intercept BigInt serialization before sending JSON responses
  app.use(bigIntSerializationMiddleware);

  // System & Health routes (Public)
  app.use("/api/health", createHealthRouter(prisma));

  // Authentication Core: Login, Logout, /api/auth/me
  app.use("/api/auth", createAuthRouter(prisma));

  // Developer A: CRM, Enquiries & Couples (Protected)
  app.use("/api/crm", createCrmRouter(prisma));

  // Developer A: Service Agreements & Digital Signatures (Protected)
  app.use("/api/agreements", createAgreementRouter(prisma));

  // Developer A: Weddings & Automated Task Pipelines (Protected)
  app.use("/api/weddings", createWeddingOpsRouter(prisma));

  // Developer A: Day-of Operations, Schedules, Radar, Incidents & Staff (Protected)
  app.use("/api/operations", createDayOfOpsRouter(prisma));

  // Developer B: Vendor Procurement, RFQs, Financial Ledger & Analytics
  app.use("/api", createDevBRouter(prisma));

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
