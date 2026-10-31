import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { CrmService } from "../services/crm.service.js";
import { CreateEnquirySchema, ScheduleConsultationSchema } from "shared";
import { z } from "zod";

const UpdateEnquiryStatusSchema = z.object({
  status: z.enum(["NEW", "CONSULTATION_SCHEDULED", "AGREEMENT_SENT", "CONVERTED", "LOST"])
});

const ConvertToCoupleSchema = z.object({
  partnerOneName: z.string().min(2).optional(),
  partnerTwoName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional()
});

export function createCrmRouter(prisma: PrismaClient): Router {
  const router = Router();
  const crmService = new CrmService(prisma);

  // List all enquiries with optional status or search query
  router.get("/enquiries", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, search } = req.query;
      const enquiries = await crmService.listEnquiries({
        status: typeof status === "string" ? status : undefined,
        search: typeof search === "string" ? search : undefined
      });
      res.json({ success: true, data: enquiries });
    } catch (err) {
      next(err);
    }
  });

  // Get enquiry by ID
  router.get("/enquiries/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enquiry = await crmService.getEnquiryById(req.params.id);
      if (!enquiry) {
        return res.status(404).json({ success: false, error: "Enquiry not found" });
      }
      res.json({ success: true, data: enquiry });
    } catch (err) {
      next(err);
    }
  });

  // Create new enquiry
  router.post("/enquiries", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateEnquirySchema.parse(req.body);
      const enquiry = await crmService.createEnquiry(validated);
      res.status(201).json({ success: true, data: enquiry });
    } catch (err) {
      next(err);
    }
  });

  // Schedule consultation on enquiry
  router.post("/enquiries/:id/schedule-consultation", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = ScheduleConsultationSchema.parse(req.body);
      const updated = await crmService.scheduleConsultation(req.params.id, validated);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // Update enquiry pipeline status
  router.patch("/enquiries/:id/status", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = UpdateEnquiryStatusSchema.parse(req.body);
      const updated = await crmService.updateEnquiryStatus(req.params.id, validated.status);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });

  // Convert enquiry to couple profile
  router.post("/enquiries/:id/convert-to-couple", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = ConvertToCoupleSchema.parse(req.body);
      const couple = await crmService.convertToCouple(req.params.id, validated);
      res.status(201).json({ success: true, data: couple });
    } catch (err) {
      next(err);
    }
  });

  // List all couples
  router.get("/couples", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const couples = await crmService.listCouples();
      res.json({ success: true, data: couples });
    } catch (err) {
      next(err);
    }
  });

  // Get couple profile by ID
  router.get("/couples/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const couple = await crmService.getCoupleById(req.params.id);
      if (!couple) {
        return res.status(404).json({ success: false, error: "Couple profile not found" });
      }
      res.json({ success: true, data: couple });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
