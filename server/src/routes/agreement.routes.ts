import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AgreementService } from "../services/agreement.service.js";
import { CreateServiceAgreementSchema, SignServiceAgreementSchema, hasPermission, UserRole } from "shared";
import { authenticate, requirePermission, validateCsrf } from "../middleware/auth.js";

export function createAgreementRouter(prisma: PrismaClient): Router {
  const router = Router();
  const agreementService = new AgreementService(prisma);

  // All Agreement routes require an authenticated session
  router.use(authenticate(prisma));

  // Create or draft service agreement
  router.post("/", requirePermission("contracts:agreement:create"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateServiceAgreementSchema.parse(req.body);
      const agreement = await agreementService.createOrUpdateAgreement(validated as any);
      res.status(201).json({ success: true, data: agreement });
    } catch (err) {
      next(err);
    }
  });

  // Get agreement by Couple ID (Redacts signatureDataUrl if lacking contracts:signature:view)
  router.get("/by-couple/:coupleId", requirePermission("contracts:agreement:read"), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agreement = await agreementService.getAgreementByCoupleId(req.params.coupleId);
      if (!agreement) {
        return res.status(404).json({ success: false, error: "Agreement not found for this couple" });
      }

      const userRole = req.user?.role as UserRole;
      const canViewSignature = userRole ? hasPermission(userRole, "contracts:signature:view") : false;

      const sanitizedData = {
        ...agreement,
        signatureDataUrl: canViewSignature ? agreement.signatureDataUrl : null
      };

      res.json({ success: true, data: sanitizedData });
    } catch (err) {
      next(err);
    }
  });

  // Digitally execute/sign agreement
  router.post("/:id/sign", requirePermission("contracts:agreement:sign"), validateCsrf(prisma), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = SignServiceAgreementSchema.parse(req.body);
      const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
      const executed = await agreementService.signAgreement(req.params.id, {
        signatureDataUrl: validated.signatureDataUrl,
        signedByName: validated.signedByName,
        clientIp
      });
      res.json({ success: true, data: executed });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
