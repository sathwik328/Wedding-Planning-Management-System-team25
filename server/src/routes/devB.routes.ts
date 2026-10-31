import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { createVendorRouter } from "./vendor.routes.js";
import { createRfqRouter } from "./rfq.routes.js";
import { createFinanceRouter } from "./finance.routes.js";
import { createAnalyticsRouter } from "./analytics.routes.js";

/**
 * Composite Router for Developer B's Vendor Procurement & Finance modules.
 * 
 * Developer A Integration Guide:
 * Mount in `server/src/app.ts` using:
 * ```ts
 * import { createDevBRouter } from "./routes/devB.routes.js";
 * app.use("/api", createDevBRouter(prisma));
 * ```
 * 
 * Routes provided:
 * - /api/vendors
 * - /api/rfq
 * - /api/finance
 * - /api/analytics
 */
export function createDevBRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.use("/vendors", createVendorRouter(prisma));
  router.use("/rfq", createRfqRouter(prisma));
  router.use("/finance", createFinanceRouter(prisma));
  router.use("/analytics", createAnalyticsRouter(prisma));

  return router;
}

export {
  createVendorRouter,
  createRfqRouter,
  createFinanceRouter,
  createAnalyticsRouter
};
