import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { hasPermission, UserRole } from "shared";
import { TeamLaborService } from "../services/teamLabor.service.js";
import { SeasonalAnalyticsService } from "../services/seasonalAnalytics.service.js";
import { authenticate, requirePermission, validateCsrf } from "../middleware/index.js";

export function createAnalyticsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const laborService = new TeamLaborService(prisma);
  const seasonalService = new SeasonalAnalyticsService(prisma);

  // All analytics routes require an authenticated session
  router.use(authenticate(prisma));

  // GET /api/analytics/work-logs/:weddingId - Get labor logs for wedding
  router.get("/work-logs/:weddingId", requirePermission("analytics:labor:read"), async (req: Request, res: Response) => {
    try {
      const summary = await laborService.getWeddingLaborSummary(req.params.weddingId);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch labor logs" });
    }
  });

  // POST /api/analytics/work-logs - Record internal planning labor
  router.post("/work-logs", requirePermission("analytics:labor:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
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
  router.get("/seasonal", requirePermission("analytics:seasonal:read"), async (req: Request, res: Response) => {
    try {
      const report = await seasonalService.getSeasonalFinancialAnalytics();

      // Financial Security Fix: Portfolio-level treasury and consolidated financial information must be separately gated
      // using the dedicated 'analytics:treasury:read' permission. Do not expose treasury fields merely because a user can view general seasonal analytics.
      const userRole = req.user?.role as UserRole;
      const canViewTreasury = userRole ? hasPermission(userRole, "analytics:treasury:read") : false;

      let sanitizedReport = report;
      if (!canViewTreasury) {
        const { portfolioLedger, ...rest } = report as any;
        sanitizedReport = rest;
      }

      res.json(sanitizedReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to compute seasonal analytics" });
    }
  });

  // GET /api/analytics/treasury - Get dedicated portfolio treasury overview
  router.get("/treasury", requirePermission("analytics:treasury:read"), async (_req: Request, res: Response) => {
    try {
      const report = await seasonalService.getSeasonalFinancialAnalytics();
      res.json({
        seasonOverview: report.seasonOverview,
        portfolioLedger: report.portfolioLedger
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to compute treasury analytics" });
    }
  });

  return router;
}
