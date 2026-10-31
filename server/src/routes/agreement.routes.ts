import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AgreementService } from "../services/agreement.service.js";
import { CreateServiceAgreementSchema, SignServiceAgreementSchema } from "shared";

export function createAgreementRouter(prisma: PrismaClient): Router {
  const router = Router();
  const agreementService = new AgreementService(prisma);

  // Create or draft service agreement
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateServiceAgreementSchema.parse(req.body);
      const agreement = await agreementService.createOrUpdateAgreement(validated as any);
      res.status(201).json({ success: true, data: agreement });
    } catch (err) {
      next(err);
    }
  });

  // Get agreement by Couple ID
  router.get("/by-couple/:coupleId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agreement = await agreementService.getAgreementByCoupleId(req.params.coupleId);
      if (!agreement) {
        return res.status(404).json({ success: false, error: "Agreement not found for this couple" });
      }
      res.json({ success: true, data: agreement });
    } catch (err) {
      next(err);
    }
  });

  // Digitally execute/sign agreement
  router.post("/:id/sign", async (req: Request, res: Response, next: NextFunction) => {
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
