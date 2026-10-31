import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { hasPermission, UserRole } from "shared";
import { ClientBillingService } from "../services/clientBilling.service.js";
import { VendorSettlementService } from "../services/vendorSettlement.service.js";
import { createDirectExpensePaymentWithRetry } from "../services/directExpensePayment.service.js";
import { computeAuthoritativeWeddingLedger } from "../services/financialLedger.service.js";
import { authenticate, requirePermission, validateCsrf } from "../middleware/index.js";

export function createFinanceRouter(prisma: PrismaClient): Router {
  const router = Router();
  const billingService = new ClientBillingService(prisma);
  const settlementService = new VendorSettlementService(prisma);

  // All finance routes require an authenticated session
  router.use(authenticate(prisma));

  // -------------------------------------------------------------
  // CLIENT MILESTONES & INVOICES
  // -------------------------------------------------------------

  router.get("/milestones/:weddingId", requirePermission("finance:milestone:read"), async (req: Request, res: Response) => {
    try {
      const milestones = await billingService.listMilestonesForWedding(req.params.weddingId);
      res.json(milestones);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list milestones" });
    }
  });

  router.post("/milestones", requirePermission("finance:milestone:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { weddingId, type, title, dueDate, targetAmountPaise } = req.body;
      if (!weddingId || !type || !title || !dueDate || !targetAmountPaise) {
        return res.status(400).json({ error: "Missing required milestone fields" });
      }

      const milestone = await billingService.createMilestone({
        weddingId,
        type,
        title,
        dueDate: new Date(dueDate),
        targetAmountPaise: BigInt(targetAmountPaise)
      });
      res.status(201).json(milestone);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create milestone" });
    }
  });

  router.get("/invoices/:weddingId", requirePermission("finance:invoice:read"), async (req: Request, res: Response) => {
    try {
      const invoices = await billingService.listInvoicesForWedding(req.params.weddingId);
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list invoices" });
    }
  });

  router.get("/invoices/detail/:id", requirePermission("finance:invoice:read"), async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.getInvoiceById(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: `Invoice "${req.params.id}" not found` });
      }
      res.json(invoice);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch invoice" });
    }
  });

  router.post("/invoices", requirePermission("finance:invoice:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        weddingId,
        invoiceNumber,
        invoiceType,
        dueDate,
        subtotalPaise,
        taxPaise,
        extraChargesPaise,
        totalAmountPaise,
        milestoneIds,
        additionalChargeIds
      } = req.body;

      if (!weddingId || !invoiceNumber || !invoiceType || !dueDate || !subtotalPaise) {
        return res.status(400).json({ error: "Missing required invoice fields" });
      }

      const invoice = await billingService.createInvoice({
        weddingId,
        invoiceNumber,
        invoiceType,
        dueDate: new Date(dueDate),
        subtotalPaise: BigInt(subtotalPaise),
        taxPaise: taxPaise ? BigInt(taxPaise) : 0n,
        extraChargesPaise: extraChargesPaise ? BigInt(extraChargesPaise) : 0n,
        totalAmountPaise: totalAmountPaise ? BigInt(totalAmountPaise) : (undefined as any),
        milestoneIds,
        additionalChargeIds
      });
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create invoice" });
    }
  });

  // Client payment recording - forces status to PENDING and registers creation audit log atomically
  router.post("/client-payments", requirePermission("finance:payment:record"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { clientInvoiceId, amountPaise, paymentMethod, transactionReference, notes } = req.body;

      if (!clientInvoiceId || !amountPaise || !paymentMethod || !transactionReference) {
        return res.status(400).json({ error: "Missing required payment fields" });
      }

      // Financial Security Fix: New payments MUST begin as PENDING. Reject or override injected CLEARED status.
      // Payment creation and its creation audit record are committed atomically inside the service transaction.
      const payment = await billingService.recordClientPayment({
        clientInvoiceId,
        amountPaise: BigInt(amountPaise),
        paymentMethod,
        transactionReference,
        status: "PENDING",
        notes,
        performedBy: req.user!.id
      });

      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record client payment" });
    }
  });

  // Client payment clearance - requires approval permission, fail-closed audit verification, and atomic state transition
  router.put("/client-payments/:id/clear", requirePermission("finance:payment:approve"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Check payment existence
        const payment = await tx.clientPayment.findUnique({
          where: { id: paymentId },
          include: {
            clientInvoice: {
              include: {
                payments: true,
                milestones: true
              }
            }
          }
        });

        if (!payment) {
          return { errorStatus: 404, errorMessage: `Client payment "${paymentId}" not found` };
        }

        // 2. Reject if payment is not PENDING
        if (payment.status !== "PENDING") {
          return {
            errorStatus: 400,
            errorMessage: `Payment cannot be cleared: current status is "${payment.status}" (must be PENDING).`
          };
        }

        // 3. Separation of Duties: Check creation audit record (Fail-Closed)
        const recordLog = await tx.auditLog.findFirst({
          where: {
            entityName: "ClientPayment",
            entityId: paymentId,
            action: "RECORD_PAYMENT"
          }
        });

        // Fail-closed: Creation audit record must exist with creator attribution
        if (!recordLog || !recordLog.performedBy) {
          return {
            errorStatus: 403,
            errorMessage: "Approval rejected: Missing or unverifiable creation audit record. Creator attribution cannot be established."
          };
        }

        // Verify audit record is associated with the exact payment being approved
        if (recordLog.entityId !== paymentId) {
          return {
            errorStatus: 403,
            errorMessage: "Approval rejected: Audit record entity mismatch."
          };
        }

        // Reject if creator is the approver
        if (recordLog.performedBy === req.user!.id) {
          return {
            errorStatus: 403,
            errorMessage: "Separation of duties violation: Payment creator cannot approve their own payment."
          };
        }

        // 4. Atomic conditional update: only transitions if current status is PENDING
        const updateResult = await tx.clientPayment.updateMany({
          where: {
            id: paymentId,
            status: "PENDING"
          },
          data: {
            status: "CLEARED",
            clearedAt: new Date()
          }
        });

        if (updateResult.count === 0) {
          return {
            errorStatus: 400,
            errorMessage: "Payment is already cleared or no longer in PENDING status."
          };
        }

        // 5. Recalculate invoice cleared sum and update invoice/milestones
        const invoice = payment.clientInvoice;
        let clearedSumBig = 0n;
        for (const p of invoice.payments) {
          if (p.id === paymentId) {
            clearedSumBig += payment.amountPaise;
          } else if (p.status === "CLEARED") {
            clearedSumBig += p.amountPaise;
          }
        }

        let newInvoiceStatus = invoice.status;
        if (clearedSumBig >= invoice.totalAmountPaise) {
          newInvoiceStatus = "PAID";
        } else if (clearedSumBig > 0n) {
          newInvoiceStatus = "PARTIALLY_PAID";
        }

        if (newInvoiceStatus !== invoice.status) {
          await tx.clientInvoice.update({
            where: { id: invoice.id },
            data: { status: newInvoiceStatus }
          });

          if (newInvoiceStatus === "PAID" && invoice.milestones.length > 0) {
            for (const m of invoice.milestones) {
              await tx.paymentMilestone.update({
                where: { id: m.milestoneId },
                data: { status: "PAID" }
              });
            }
          } else if (newInvoiceStatus === "PARTIALLY_PAID" && invoice.milestones.length > 0) {
            for (const m of invoice.milestones) {
              await tx.paymentMilestone.update({
                where: { id: m.milestoneId },
                data: { status: "PARTIALLY_PAID" }
              });
            }
          }
        }

        // 6. Audit approval log identifying the approving user inside the transaction
        await tx.auditLog.create({
          data: {
            entityName: "ClientPayment",
            entityId: paymentId,
            action: "APPROVE_PAYMENT",
            performedBy: req.user!.id,
            detailsJson: JSON.stringify({
              approvedBy: req.user!.id,
              approvedByEmail: req.user!.email,
              clearedAt: new Date().toISOString()
            })
          }
        });

        const updatedPayment = await tx.clientPayment.findUnique({
          where: { id: paymentId }
        });

        return { payment: updatedPayment };
      });

      if (result.errorStatus) {
        return res.status(result.errorStatus).json({ error: result.errorMessage });
      }

      res.json(result.payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to mark payment cleared" });
    }
  });

  // -------------------------------------------------------------
  // VENDOR BILLS & SETTLEMENT PAYMENTS
  // -------------------------------------------------------------

  router.get("/bills/:weddingId", requirePermission("finance:vendor_bill:read"), async (req: Request, res: Response) => {
    try {
      const bills = await settlementService.listBillsForWedding(req.params.weddingId);
      res.json(bills);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list vendor bills" });
    }
  });

  router.get("/bills/detail/:id", requirePermission("finance:vendor_bill:read"), async (req: Request, res: Response) => {
    try {
      const bill = await settlementService.getBillById(req.params.id);
      if (!bill) {
        return res.status(404).json({ error: `Vendor bill "${req.params.id}" not found` });
      }
      res.json(bill);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch bill" });
    }
  });

  router.post("/bills", requirePermission("finance:vendor_bill:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        weddingVendorId,
        billNumber,
        baseAmountPaise,
        extraAmountPaise,
        totalBilledPaise,
        additionalChargeIds
      } = req.body;

      if (!weddingVendorId || !billNumber || !baseAmountPaise) {
        return res.status(400).json({ error: "Missing required vendor bill fields" });
      }

      const bill = await settlementService.createVendorBill({
        weddingVendorId,
        billNumber,
        baseAmountPaise: BigInt(baseAmountPaise),
        extraAmountPaise: extraAmountPaise ? BigInt(extraAmountPaise) : 0n,
        totalBilledPaise: totalBilledPaise ? BigInt(totalBilledPaise) : undefined,
        additionalChargeIds
      });
      res.status(201).json(bill);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create vendor bill" });
    }
  });

  router.post("/bills/:id/reconcile", requirePermission("finance:vendor_bill:reconcile"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const { varianceReason, reconciliationNotes } = req.body;
      const summary = await settlementService.reconcileBill({
        billId: req.params.id,
        varianceReason: varianceReason || "Standard contract quotation fulfillment",
        reconciliationNotes: reconciliationNotes || "Reconciled against agreed baseline amount"
      });
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to reconcile vendor bill" });
    }
  });

  // Vendor payment recording - forces status to PENDING and registers creation audit log atomically
  router.post("/vendor-payments", requirePermission("finance:vendor_payment:record"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        vendorBillId,
        paymentType,
        amountPaise,
        paymentMethod,
        transactionReference,
        notes
      } = req.body;

      if (!vendorBillId || !paymentType || !amountPaise || !paymentMethod || !transactionReference) {
        return res.status(400).json({ error: "Missing required vendor payment fields" });
      }

      // Financial Security Fix: New vendor payments MUST begin as PENDING
      // Payment creation and its creation audit record are committed atomically inside the service transaction.
      const payment = await settlementService.recordVendorPayment({
        vendorBillId,
        paymentType,
        amountPaise: BigInt(amountPaise),
        paymentMethod,
        transactionReference,
        status: "PENDING",
        notes,
        performedBy: req.user!.id
      });

      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record vendor payment" });
    }
  });

  // Vendor payment clearance - requires approval permission, fail-closed audit verification, and atomic state transition
  router.put("/vendor-payments/:id/clear", requirePermission("finance:vendor_payment:approve"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Check payment existence
        const payment = await tx.vendorPayment.findUnique({
          where: { id: paymentId },
          include: {
            vendorBill: {
              include: {
                payments: true
              }
            }
          }
        });

        if (!payment) {
          return { errorStatus: 404, errorMessage: `Vendor payment "${paymentId}" not found` };
        }

        // 2. Reject if payment is not PENDING
        if (payment.status !== "PENDING") {
          return {
            errorStatus: 400,
            errorMessage: `Vendor payment cannot be cleared: current status is "${payment.status}" (must be PENDING).`
          };
        }

        // 3. Separation of Duties: Check creation audit record (Fail-Closed)
        const recordLog = await tx.auditLog.findFirst({
          where: {
            entityName: "VendorPayment",
            entityId: paymentId,
            action: "RECORD_PAYMENT"
          }
        });

        // Fail-closed: Creation audit record must exist with creator attribution
        if (!recordLog || !recordLog.performedBy) {
          return {
            errorStatus: 403,
            errorMessage: "Approval rejected: Missing or unverifiable creation audit record. Creator attribution cannot be established."
          };
        }

        // Verify audit record is associated with the exact payment being approved
        if (recordLog.entityId !== paymentId) {
          return {
            errorStatus: 403,
            errorMessage: "Approval rejected: Audit record entity mismatch."
          };
        }

        // Reject if creator is the approver
        if (recordLog.performedBy === req.user!.id) {
          return {
            errorStatus: 403,
            errorMessage: "Separation of duties violation: Vendor payment creator cannot approve their own payment."
          };
        }

        // 4. Atomic conditional update: only transitions if current status is PENDING
        const updateResult = await tx.vendorPayment.updateMany({
          where: {
            id: paymentId,
            status: "PENDING"
          },
          data: {
            status: "CLEARED",
            clearedAt: new Date()
          }
        });

        if (updateResult.count === 0) {
          return {
            errorStatus: 400,
            errorMessage: "Vendor payment is already cleared or no longer in PENDING status."
          };
        }

        // 5. Recalculate cleared total on bill and update bill status if paid
        const bill = payment.vendorBill;
        let clearedSumBig = 0n;
        for (const p of bill.payments) {
          if (p.id === paymentId) {
            clearedSumBig += payment.amountPaise;
          } else if (p.status === "CLEARED") {
            clearedSumBig += p.amountPaise;
          }
        }

        if (clearedSumBig >= bill.totalBilledPaise && bill.status !== "PAID") {
          await tx.vendorBill.update({
            where: { id: bill.id },
            data: { status: "PAID" }
          });
        }

        // 6. Audit approval log identifying the approving user inside the transaction
        await tx.auditLog.create({
          data: {
            entityName: "VendorPayment",
            entityId: paymentId,
            action: "APPROVE_PAYMENT",
            performedBy: req.user!.id,
            detailsJson: JSON.stringify({
              approvedBy: req.user!.id,
              approvedByEmail: req.user!.email,
              clearedAt: new Date().toISOString()
            })
          }
        });

        const updatedPayment = await tx.vendorPayment.findUnique({
          where: { id: paymentId }
        });

        return { payment: updatedPayment };
      });

      if (result.errorStatus) {
        return res.status(result.errorStatus).json({ error: result.errorMessage });
      }

      res.json(result.payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to mark vendor payment cleared" });
    }
  });

  // -------------------------------------------------------------
  // ADDITIONAL CHARGES & DIRECT EXPENSE PAYMENTS
  // -------------------------------------------------------------

  router.get("/charges/:weddingId", requirePermission("finance:vendor_bill:read"), async (req: Request, res: Response) => {
    try {
      const charges = await settlementService.listAdditionalChargesForWedding(
        req.params.weddingId
      );
      res.json(charges);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list additional charges" });
    }
  });

  router.post("/charges", requirePermission("finance:vendor_bill:create"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        weddingId,
        description,
        reasonType,
        quantityScaledUnits,
        unitCostPaise,
        totalCostPaise,
        vendorId,
        weddingVendorId,
        incidentId,
        billedToClient
      } = req.body;

      if (!weddingId || !description || !reasonType || !unitCostPaise || !totalCostPaise) {
        return res.status(400).json({ error: "Missing required additional charge fields" });
      }

      const charge = await settlementService.createAdditionalCharge({
        weddingId,
        description,
        reasonType,
        quantityScaledUnits: quantityScaledUnits ? BigInt(quantityScaledUnits) : 1000n,
        unitCostPaise: BigInt(unitCostPaise),
        totalCostPaise: BigInt(totalCostPaise),
        vendorId,
        weddingVendorId,
        incidentId,
        billedToClient
      });
      res.status(201).json(charge);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create additional charge" });
    }
  });

  // Direct Expense Payment with Concurrency Lock & Retry Engine
  router.post("/direct-payments", requirePermission("finance:direct_expense:pay"), validateCsrf(prisma), async (req: Request, res: Response) => {
    try {
      const {
        weddingId,
        additionalChargeId,
        amountPaise,
        paymentMethod,
        transactionReference,
        status,
        notes
      } = req.body;

      if (!weddingId || !additionalChargeId || !amountPaise || !paymentMethod || !transactionReference) {
        return res.status(400).json({ error: "Missing required direct expense payment fields" });
      }

      const result = await createDirectExpensePaymentWithRetry(prisma, {
        weddingId,
        additionalChargeId,
        amountPaise: BigInt(amountPaise),
        paymentMethod,
        transactionReference,
        status: status || "PENDING",
        notes
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record direct payment" });
    }
  });

  // -------------------------------------------------------------
  // AUTHORITATIVE FINANCIAL LEDGER & ANOMALY FILTERING
  // -------------------------------------------------------------

  router.get("/ledger/:weddingId", requirePermission("finance:ledger:read"), async (req: Request, res: Response) => {
    try {
      const report = await computeAuthoritativeWeddingLedger(prisma, req.params.weddingId);

      // Financial Security Fix: Users with ordinary ledger read permission must not automatically receive internal anomaly information.
      // Only users with dedicated 'finance:anomalies:read' permission receive auditAnomalies.
      const userRole = req.user?.role as UserRole;
      const canViewAnomalies = userRole ? hasPermission(userRole, "finance:anomalies:read") : false;

      const sanitizedReport = {
        ...report,
        auditAnomalies: canViewAnomalies ? report.auditAnomalies : []
      };

      res.json(sanitizedReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to compute ledger" });
    }
  });

  return router;
}
