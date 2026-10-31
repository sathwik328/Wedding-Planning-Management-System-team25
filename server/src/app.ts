import express, { Express } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { bigIntSerializationMiddleware } from "./middleware/bigIntSerializer.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createCrmRouter } from "./routes/crm.routes.js";
import { createAgreementRouter } from "./routes/agreement.routes.js";

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

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
