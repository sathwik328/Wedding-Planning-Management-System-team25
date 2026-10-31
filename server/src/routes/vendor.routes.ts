import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { VendorProcurementService } from "../services/vendorProcurement.service.js";

export function createVendorRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new VendorProcurementService(prisma);

  // GET /api/vendors - List all vendors with optional filters
  router.get("/", async (req: Request, res: Response) => {
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
  router.get("/:id", async (req: Request, res: Response) => {
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
  router.post("/", async (req: Request, res: Response) => {
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
  router.put("/:id", async (req: Request, res: Response) => {
    try {
      const vendor = await service.updateVendor(req.params.id, req.body);
      res.json(vendor);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to update vendor" });
    }
  });

  return router;
}
