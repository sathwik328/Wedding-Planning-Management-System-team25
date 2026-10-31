import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { DayOfOpsService } from "../services/dayOfOps.service.js";
import { z } from "zod";
import { authenticate, requirePermission, validateCsrf } from "../middleware/auth.js";

const CreateScheduleSchema = z.object({
  weddingDayId: z.string().uuid(),
  subEvent: z.enum(["MEHENDI", "HALDI", "SANGEET", "BARAAT", "PHERAS", "RECEPTION"]),
  activityName: z.string().min(3),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().min(2),
  coordinatorId: z.string().uuid().optional(),
  notes: z.string().optional()
});

const CheckInVendorSchema = z.object({
  checkedInBy: z.string().min(2),
  notes: z.string().optional()
});

const CreateIncidentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).default("MEDIUM"),
  reportedBy: z.string().min(2)
});

const ResolveIncidentSchema = z.object({
  resolutionNotes: z.string().min(3)
});

export function createDayOfOpsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const opsService = new DayOfOpsService(prisma);

  // All Day-of Operations routes require an authenticated session
  router.use(authenticate(prisma));

  // Get minute-by-minute schedules
  router.get("/:weddingId/schedules", requirePermission("operations:schedule:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = await opsService.getSchedules(req.params.weddingId);
      res.json({ success: true, data: schedules });
    } catch (err) {
      next(err);
    }
  });

  // Create an activity schedule
  router.post("/:weddingId/schedules", requirePermission("operations:schedule:manage"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateScheduleSchema.parse(req.body);
      const schedule = await opsService.createSchedule(req.params.weddingId, validated);
      res.status(201).json({ success: true, data: schedule });
    } catch (err) {
      next(err);
    }
  });

  // Delete an activity schedule
  router.delete("/:weddingId/schedules/:scheduleId", requirePermission("operations:schedule:manage"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      await opsService.deleteSchedule(req.params.scheduleId);
      res.json({ success: true, message: "Schedule deleted successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Get vendor arrival radar
  router.get("/:weddingId/vendor-check-ins", requirePermission("operations:radar:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const checkIns = await opsService.getVendorCheckIns(req.params.weddingId);
      res.json({ success: true, data: checkIns });
    } catch (err) {
      next(err);
    }
  });

  // Log vendor arrival check-in
  router.post("/:weddingId/vendor-check-ins/:id/check-in", requirePermission("operations:radar:checkin"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CheckInVendorSchema.parse(req.body);
      const updated = await opsService.checkInVendor(req.params.id, validated.checkedInBy, validated.notes);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // Get incidents
  router.get("/:weddingId/incidents", requirePermission("operations:incident:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incidents = await opsService.getIncidents(req.params.weddingId);
      res.json({ success: true, data: incidents });
    } catch (err) {
      next(err);
    }
  });

  // Log an incident
  router.post("/:weddingId/incidents", requirePermission("operations:incident:create"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateIncidentSchema.parse(req.body);
      const incident = await opsService.createIncident(req.params.weddingId, validated);
      res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  });

  // Resolve an incident
  router.patch("/:weddingId/incidents/:id/resolve", requirePermission("operations:incident:resolve"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = ResolveIncidentSchema.parse(req.body);
      const resolved = await opsService.resolveIncident(req.params.id, validated.resolutionNotes);
      res.json({ success: true, data: resolved });
    } catch (err) {
      next(err);
    }
  });

  // Get operations cockpit summary (radar, roster, incidents)
  router.get("/:weddingId/cockpit", requirePermission("operations:radar:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cockpit = await opsService.getOperationsCockpit(req.params.weddingId);
      res.json({ success: true, data: cockpit });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
