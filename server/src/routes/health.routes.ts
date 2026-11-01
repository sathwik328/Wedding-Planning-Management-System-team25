import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

export function createHealthRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: {
          status: "HEALTHY",
          service: "The Royal Knot API",
          database: "CONNECTED",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: error.message
        }
      });
    }
  });

  return router;
}
