import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { TeamLaborService } from "../services/teamLabor.service.js";
import { SeasonalAnalyticsService } from "../services/seasonalAnalytics.service.js";

export function createAnalyticsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const laborService = new TeamLaborService(prisma);
  const seasonalService = new SeasonalAnalyticsService(prisma);

  // GET /api/analytics/work-logs/:weddingId - Get labor logs for wedding
  router.get("/work-logs/:weddingId", async (req: Request, res: Response) => {
    try {
      const summary = await laborService.getWeddingLaborSummary(req.params.weddingId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch labor logs" });
    }
  });

  // POST /api/analytics/work-logs - Record internal planning labor
  router.post("/work-logs", async (req: Request, res: Response) => {
    try {
      const { weddingId, userId, date, hoursWorked, taskDescription } = req.body;
      if (!weddingId || !userId || !date || hoursWorked === undefined || !taskDescription) {
        return res.status(400).json({ error: "Missing required work log parameters" });
      }

      const log = await laborService.recordWorkLog({
        weddingId,
        userId,
        date: new Date(date),
        hoursWorked: Number(hoursWorked),
        taskDescription
      });
      res.status(201).json(log);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record work log" });
    }
  });

  // GET /api/analytics/seasonal - Get seasonal portfolio analytics across destination weddings
  router.get("/seasonal", async (_req: Request, res: Response) => {
    try {
      const report = await seasonalService.getSeasonalFinancialAnalytics();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to compute seasonal analytics" });
    }
  });

  return router;
}
