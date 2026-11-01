import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { WeddingOpsService } from "../services/weddingOps.service.js";
import { GuestPortalService } from "../services/guest-portal.service.js";
import { ConfirmWeddingSchema, GeneratePortalTokenSchema, hasPermission, UserRole } from "shared";
import { z } from "zod";
import { authenticate, requirePermission, validateCsrf } from "../middleware/auth.js";

const UpdateTaskSchema = z.object({
  stage: z.enum(["TO_PLAN", "IN_PROGRESS", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  dueDate: z.string().optional(),
  title: z.string().min(2).optional()
});

const CreateCustomTaskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  category: z.enum(["VENUE_DESIGN", "VENDORS", "GUEST_LOGISTICS", "BIG_DAY_EXECUTION"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  dueDate: z.string(),
  assignedToId: z.string().uuid().optional()
});

export function createWeddingOpsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const weddingOpsService = new WeddingOpsService(prisma);
  const portalService = new GuestPortalService(prisma);

  // All Wedding Operations routes require an authenticated session
  router.use(authenticate(prisma));

  // List all weddings
  router.get("/", requirePermission("weddings:wedding:read"), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const weddings = await weddingOpsService.listWeddings();
      res.json({ success: true, data: weddings });
    } catch (err) {
      next(err);
    }
  });

  // Get team members for assignment
  router.get("/team/members", requirePermission("weddings:task:read"), async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true
        }
      });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  });

  // Get single wedding by ID
  router.get("/:id", requirePermission("weddings:wedding:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wedding = await weddingOpsService.getWeddingById(req.params.id);
      if (!wedding) {
        return res.status(404).json({ success: false, error: "Wedding not found" });
      }
      res.json({ success: true, data: wedding });
    } catch (err) {
      next(err);
    }
  });

  // Create new wedding & auto-generate tasks
  router.post("/", requirePermission("weddings:wedding:create"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = ConfirmWeddingSchema.parse(req.body);
      const wedding = await weddingOpsService.createWedding(validated as any);
      res.status(201).json({ success: true, data: wedding });
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------
  // FEATURE 3: GUEST MANAGEMENT & QR PORTAL TOKEN CONTROL
  // -------------------------------------------------------------
  router.post("/:id/portal-token", requirePermission("weddings:wedding:update"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = GeneratePortalTokenSchema.parse(req.body);
      const result = await portalService.generatePortalToken(req.params.id, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id/portal-token", requirePermission("weddings:wedding:update"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      await portalService.revokePortalToken(req.params.id);
      res.json({ success: true, message: "Guest portal access revoked successfully" });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/guests", requirePermission("weddings:wedding:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const guests = await portalService.getWeddingGuests(req.params.id);
      res.json({ success: true, data: guests });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id/guests/export", requirePermission("weddings:wedding:update"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await portalService.exportGuestsCsv(req.params.id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="wedding_${req.params.id}_guests.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  // -------------------------------------------------------------
  // TASKS
  // -------------------------------------------------------------
  router.get("/:id/tasks", requirePermission("weddings:task:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stage, priority, category, assignedToId } = req.query;
      const tasks = await weddingOpsService.listTasks(req.params.id, {
        stage: typeof stage === "string" ? stage : undefined,
        priority: typeof priority === "string" ? priority : undefined,
        category: typeof category === "string" ? category : undefined,
        assignedToId: typeof assignedToId === "string" ? assignedToId : undefined
      });
      res.json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  });

  // Update a task stage, priority, or assignment
  router.patch("/:id/tasks/:taskId", requirePermission("weddings:task:update"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = UpdateTaskSchema.parse(req.body);

      // If assigning a task to someone, require task:assign permission
      if (validated.assignedToId !== undefined) {
        const userRole = req.user?.role as UserRole;
        if (!hasPermission(userRole, "weddings:task:assign")) {
          return res.status(403).json({ error: "Forbidden. Role lacks task assignment permission." });
        }
      }

      const updated = await weddingOpsService.updateTask(req.params.taskId, validated);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // Create custom bespoke task
  router.post("/:id/tasks/custom", requirePermission("weddings:task:create"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateCustomTaskSchema.parse(req.body);
      const task = await weddingOpsService.createCustomTask({
        weddingId: req.params.id,
        ...validated
      });
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  });

  // Trigger task verification & backfill
  router.post("/:id/tasks/backfill", requirePermission("weddings:task:update"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await weddingOpsService.triggerTaskBackfill(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
