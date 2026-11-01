import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { VendorProcurementService } from "../services/vendorProcurement.service.js";
import { authenticate, requirePermission, validateCsrf } from "../middleware/index.js";

export function createRfqRouter(prisma: PrismaClient): Router {
  const router = Router();
  const service = new VendorProcurementService(prisma);

  // All RFQ routes require an authenticated session
  router.use(authenticate(prisma));

  // POST /api/rfq/groups - Create a new RFQ group for a wedding
  router.post("/groups", requirePermission("procurement:rfq:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { weddingId, title, category, targetGuestCount, vendorIds, requirement } = req.body;
      if (!weddingId || !title || !category || !vendorIds || !vendorIds.length || !requirement) {
        return res.status(400).json({ error: "Missing required fields for RFQ group creation" });
      }

      const group = await service.createRfqGroup({
        weddingId,
        title,
        category,
        targetGuestCount: Number(targetGuestCount) || 400,
        vendorIds,
        requirement
      });
      res.status(201).json(group);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create RFQ group" });
    }
  });

  // GET /api/rfq/groups/wedding/:weddingId - List RFQ groups for a specific wedding
  router.get("/groups/wedding/:weddingId", requirePermission("procurement:rfq:read"), async (req: Request, res: Response) => {
    try {
      const groups = await service.listRfqGroupsForWedding(req.params.weddingId);
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch wedding RFQ groups" });
    }
  });

  // GET /api/rfq/groups/:groupId - Get RFQ group details with quotations and requests
  router.get("/groups/:groupId", requirePermission("procurement:rfq:read"), async (req: Request, res: Response) => {
    try {
      const group = await service.getRfqGroupDetails(req.params.groupId);
      if (!group) {
        return res.status(404).json({ error: `RFQ group "${req.params.groupId}" not found` });
      }
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch RFQ group details" });
    }
  });

  // POST /api/rfq/quotations - Submit a vendor quotation with line items
  router.post("/quotations", requirePermission("procurement:rfq:submit_quote"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        vendorRequestId,
        vendorId,
        quoteReference,
        menuDescription,
        pricePerPlatePaise,
        baseAmountPaise,
        extraHourRatePaise,
        documentUrl,
        lineItems
      } = req.body;

      if (!vendorRequestId || !vendorId || !quoteReference || !baseAmountPaise) {
        return res.status(400).json({ error: "Missing required quotation parameters" });
      }

      const quotation = await service.submitQuotation({
        vendorRequestId,
        vendorId,
        quoteReference,
        menuDescription,
        pricePerPlatePaise: pricePerPlatePaise ? BigInt(pricePerPlatePaise) : undefined,
        baseAmountPaise: BigInt(baseAmountPaise),
        extraHourRatePaise: extraHourRatePaise ? BigInt(extraHourRatePaise) : 0n,
        documentUrl,
        lineItems: (lineItems || []).map((li: any) => ({
          description: li.description,
          quantityScaledUnits: BigInt(li.quantityScaledUnits || 1000),
          unitPricePaise: BigInt(li.unitPricePaise),
          totalPricePaise: BigInt(li.totalPricePaise)
        }))
      });

      res.status(201).json(quotation);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to submit quotation" });
    }
  });

  // GET /api/rfq/groups/:groupId/comparison - Get 3-vendor line-by-line comparison matrix
  router.get("/groups/:groupId/comparison", requirePermission("procurement:rfq:read"), async (req: Request, res: Response) => {
    try {
      const comparison = await service.getQuotationComparisonMatrix(req.params.groupId);
      res.json(comparison);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to generate comparison matrix" });
    }
  });

  // POST /api/rfq/groups/:groupId/award - Select winning vendor & link to wedding
  router.post("/groups/:groupId/award", requirePermission("procurement:rfq:award"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { quotationId } = req.body;
      if (!quotationId) {
        return res.status(400).json({ error: "quotationId is required to award group" });
      }

      const result = await service.awardWinningQuotation(req.params.groupId, quotationId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to award quotation" });
    }
  });

  return router;
}
