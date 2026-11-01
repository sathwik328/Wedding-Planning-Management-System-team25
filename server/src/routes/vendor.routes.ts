import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { VendorProcurementService } from "../services/vendorProcurement.service.js";
import { VendorReliabilityService } from "../services/vendor-reliability.service.js";
import { authenticate, requirePermission, validateCsrf } from "../middleware/index.js";

export function createVendorRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new VendorProcurementService(prisma);
  const reliabilityService = new VendorReliabilityService(prisma);

  // All vendor procurement routes require an authenticated session
  router.use(authenticate(prisma));

  // -------------------------------------------------------------
  // FEATURE 5: VENDOR RELIABILITY INTELLIGENCE
  // (Mounted before /:id to prevent route collision)
  // -------------------------------------------------------------
  router.get("/reliability-matrix", requirePermission("procurement:vendor:read"), async (_req: Request, res: Response) => {
    try {
      const scorecards = await reliabilityService.getVendorReliabilityMatrix();
      res.json({ success: true, data: scorecards });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate vendor reliability matrix" });
    }
  });

  router.get("/:id/reliability-dossier", requirePermission("procurement:vendor:read"), async (req: Request, res: Response) => {
    try {
      const scorecard = await reliabilityService.getVendorReliabilityDossier(req.params.id);
      res.json({ success: true, data: scorecard });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch vendor reliability dossier" });
    }
  });

  // GET /api/vendors - List all vendors with optional filters
  router.get("/", requirePermission("procurement:vendor:read"), async (req: Request, res: Response) => {
    try {
      const { category, city, search } = req.query;
      const vendors = await service.listVendors({
        category: category as string | undefined,
        city: city as string | undefined,
        search: search as string | undefined
      });
      res.json(vendors);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list vendors" });
    }
  });

  // GET /api/vendors/:id - Get vendor details, quotations, and active wedding contracts
  router.get("/:id", requirePermission("procurement:vendor:read"), async (req: Request, res: Response) => {
    try {
      const vendor = await service.getVendorById(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: `Vendor with ID "${req.params.id}" not found` });
      }
      res.json(vendor);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch vendor" });
    }
  });

  // POST /api/vendors - Register a new luxury vendor
  router.post("/", requirePermission("procurement:vendor:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { businessName, category, contactPerson, phone, email, city, notes } = req.body;
      if (!businessName || !category || !contactPerson || !phone || !email || !city) {
        return res.status(400).json({ error: "Missing required vendor fields" });
      }

      const vendor = await service.createVendor({
        businessName,
        category,
        contactPerson,
        phone,
        email,
        city,
        notes
      });
      res.status(201).json(vendor);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create vendor" });
    }
  });

  // PUT /api/vendors/:id - Update vendor profile
  router.put("/:id", requirePermission("procurement:vendor:update"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const vendor = await service.updateVendor(req.params.id, req.body);
      res.json(vendor);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update vendor" });
    }
  });

  return router;
}
