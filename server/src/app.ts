import express, { Express } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { bigIntSerializationMiddleware } from "./middleware/bigIntSerializer.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createCrmRouter } from "./routes/crm.routes.js";
import { createAgreementRouter } from "./routes/agreement.routes.js";
import { createWeddingOpsRouter } from "./routes/weddingOps.routes.js";
import { createDayOfOpsRouter } from "./routes/dayOfOps.routes.js";
import { createDevBRouter } from "./routes/devB.routes.js";

export function createApp(prisma: PrismaClient): Express {
  const app = express();

  // Basic security and parsing middleware
  app.use(cors());
  app.use(express.json());

  // Intercept BigInt serialization before sending JSON responses
  app.use(bigIntSerializationMiddleware);

  // Health and System routes
  app.use("/api/health", createHealthRouter(prisma));

  // Developer A: CRM, Enquiries & Couples
  app.use("/api/crm", createCrmRouter(prisma));

  // Developer A: Service Agreements & Digital Signatures
  app.use("/api/agreements", createAgreementRouter(prisma));

  // Developer A: Weddings & Automated Task Pipelines
  app.use("/api/weddings", createWeddingOpsRouter(prisma));

  // Developer A: Day-of Operations, Schedules, Radar, Incidents & Staff
  app.use("/api/operations", createDayOfOpsRouter(prisma));

  // Developer B: Vendor Procurement, RFQs, Financial Ledger & Analytics
  app.use("/api", createDevBRouter(prisma));

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
