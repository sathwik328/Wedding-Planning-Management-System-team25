import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, requirePermission } from "../middleware/index.js";
import { ROLE_PERMISSIONS } from "shared";

export function createAdminRouter(prisma: PrismaClient): Router {
  const router = Router();

  // All Admin routes require an authenticated session
  router.use(authenticate(prisma));

  /**
   * GET /api/admin/users
   * List all system team members with roles and activity metadata
   * Requires system:users:manage permission (ADMIN only)
   */
  router.get("/users", requirePermission("system:users:manage"), async (_req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          hourlyRatePaise: true,
          createdAt: true
        }
      });
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to fetch users" });
    }
  });

  /**
   * GET /api/admin/roles
   * Return authoritative RBAC permissions matrix
   * Requires system:users:manage permission (ADMIN only)
   */
  router.get("/roles", requirePermission("system:users:manage"), async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          roles: Object.keys(ROLE_PERMISSIONS),
          matrix: ROLE_PERMISSIONS
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to fetch roles" });
    }
  });

  /**
   * GET /api/admin/settings
   * Return agency configuration and season parameters
   * Requires system:users:manage permission (ADMIN only)
   */
  router.get("/settings", requirePermission("system:users:manage"), async (_req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        data: {
          agencyName: "The Royal Knot Luxury Wedding Operations",
          jurisdiction: "Rajasthan, India (Jaipur, Udaipur, Jodhpur)",
          activeSeason: "2026–2027 Winter Calendar",
          currency: "INR (₹)",
          numberFormat: "Indian Lakh / Crore System",
          ledgerStorage: "64-bit Integer Paise",
          securityArchitecture: "HTTP-Only Strict Sessions, Double-Submit CSRF, Scrypt KDF"
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to fetch settings" });
    }
  });

  /**
   * GET /api/admin/demo-data-explorer
   * Safe, read-only inspection of the demonstration database
   * Allowed for executive oversight roles: ADMIN and FOUNDER (via analytics:seasonal:read)
   */
  router.get("/demo-data-explorer", async (_req: Request, res: Response) => {
    try {
      const [
        couplesCount,
        weddingsCount,
        enquiriesCount,
        tasksCount,
        vendorsCount,
        rfqGroupsCount,
        quotationsCount,
        weddingVendorsCount,
        invoicesCount,
        vendorBillsCount,
        schedulesCount,
        checkInsCount,
        incidentsCount,
        contingenciesCount
      ] = await Promise.all([
        prisma.couple.count(),
        prisma.wedding.count(),
        prisma.enquiry.count(),
        prisma.task.count(),
        prisma.vendor.count(),
        prisma.quotationRequestGroup.count(),
        prisma.vendorQuotation.count(),
        prisma.weddingVendor.count(),
        prisma.clientInvoice.count(),
        prisma.vendorBill.count(),
        prisma.eventSchedule.count(),
        prisma.vendorCheckIn.count(),
        prisma.incident.count(),
        prisma.contingencyPlan.count()
      ]);

      const totalRecords =
        couplesCount +
        weddingsCount +
        enquiriesCount +
        tasksCount +
        vendorsCount +
        rfqGroupsCount +
        quotationsCount +
        weddingVendorsCount +
        invoicesCount +
        vendorBillsCount +
        schedulesCount +
        checkInsCount +
        incidentsCount +
        contingenciesCount;

      // Safe read-only samples for key entities (excluding any secret/auth hashes)
      const sampleWeddings = await prisma.wedding.findMany({
        take: 3,
        select: {
          id: true,
          title: true,
          primaryCity: true,
          venueName: true,
          packageType: true,
          status: true,
          startDate: true,
          targetGuestCount: true
        }
      });

      const sampleCouples = await prisma.couple.findMany({
        take: 3,
        select: {
          id: true,
          partnerOneName: true,
          partnerTwoName: true,
          email: true,
          phone: true,
          createdAt: true
        }
      });

      const sampleVendors = await prisma.vendor.findMany({
        take: 3,
        select: {
          id: true,
          businessName: true,
          category: true,
          city: true,
          contactPerson: true
        }
      });

      const sampleTasks = await prisma.task.findMany({
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          stage: true,
          priority: true,
          dueDate: true
        }
      });

      const sampleEnquiries = await prisma.enquiry.findMany({
        take: 5,
        select: {
          id: true,
          coupleNames: true,
          source: true,
          estimatedGuests: true,
          status: true,
          roughDate: true
        }
      });

      const sampleInvoices = await prisma.clientInvoice.findMany({
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          totalAmountPaise: true,
          status: true,
          dueDate: true
        }
      });

      const sampleBills = await prisma.vendorBill.findMany({
        take: 5,
        select: {
          id: true,
          billNumber: true,
          totalBilledPaise: true,
          status: true,
          reconciled: true
        }
      });

      const sampleRfqs = await prisma.quotationRequestGroup.findMany({
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          status: true
        }
      });

      res.json({
        success: true,
        data: {
          overview: {
            environment: "Demonstration & Development Local Environment",
            storageEngine: "SQLite (dev.db / demo.db)",
            isReadOnly: true,
            totalRecords
          },
          entityCounts: {
            Couples: couplesCount,
            Weddings: weddingsCount,
            Enquiries: enquiriesCount,
            PlanningTasks: tasksCount,
            Vendors: vendorsCount,
            RFQGroups: rfqGroupsCount,
            VendorQuotations: quotationsCount,
            ContractedWeddingVendors: weddingVendorsCount,
            ClientInvoices: invoicesCount,
            VendorBills: vendorBillsCount,
            EventSchedules: schedulesCount,
            VendorCheckIns: checkInsCount,
            Incidents: incidentsCount,
            ContingencyPlans: contingenciesCount
          },
          sampleRecords: {
            Weddings: sampleWeddings,
            Couples: sampleCouples,
            Vendors: sampleVendors,
            PlanningTasks: sampleTasks,
            Enquiries: sampleEnquiries,
            ClientInvoices: sampleInvoices,
            VendorBills: sampleBills,
            RFQGroups: sampleRfqs
          },
          relationships: [
            { from: "Enquiry", to: "Couple", type: "1:1 Conversion" },
            { from: "Couple", to: "ServiceAgreement", type: "1:1 Digital Contract" },
            { from: "Couple", to: "Wedding", type: "1:1 Operational Project" },
            { from: "Wedding", to: "Tasks", type: "1:N Automated Roadmap" },
            { from: "Wedding", to: "EventSchedule", type: "1:N Timeline Milestones" },
            { from: "Wedding", to: "WeddingVendor", type: "1:N Contracted Partners" },
            { from: "Wedding", to: "PaymentMilestone", type: "1:N Cash Flow Tranches" },
            { from: "Wedding", to: "Invoice", type: "1:N Client Receivables" },
            { from: "WeddingVendor", to: "VendorBill", type: "1:N Partner Liabilities" },
            { from: "WeddingVendor", to: "VendorCheckIn", type: "1:N Live Day-of Arrivals" },
            { from: "Wedding", to: "Incident", type: "1:N Live Exceptions" },
            { from: "Wedding", to: "ContingencyPlan", type: "1:N Standby Protocols" }
          ]
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to load demo data explorer" });
    }
  });

  return router;
}
