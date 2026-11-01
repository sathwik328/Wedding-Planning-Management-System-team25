import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { GuestPortalService } from "../services/guest-portal.service.js";
import { SubmitRsvpSchema } from "shared";
import { rateLimiter } from "../middleware/rateLimiter.js";

export function createPublicPortalRouter(prisma: PrismaClient): Router {
  const router = Router();
  const portalService = new GuestPortalService(prisma);

  // Rate limit public QR portal submissions (e.g. 60 requests per 15 minutes per IP)
  const publicPortalLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 60,
    keyPrefix: "rl:portal:"
  });

  router.use(publicPortalLimiter);

  // Get sanitized public itinerary
  router.get("/:token", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itinerary = await portalService.getPublicItinerary(req.params.token);
      if (!itinerary) {
        return res.status(404).json({
          success: false,
          error: "Guest portal link is invalid, expired, or access has been paused."
        });
      }
      res.json({ success: true, data: itinerary });
    } catch (err) {
      next(err);
    }
  });

  // Submit household RSVP
  router.post("/:token/rsvp", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = SubmitRsvpSchema.parse(req.body);
      const result = await portalService.submitHouseholdRsvp(req.params.token, validated);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
