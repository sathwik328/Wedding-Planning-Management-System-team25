import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ClientBillingService } from "../services/clientBilling.service.js";
import { VendorSettlementService } from "../services/vendorSettlement.service.js";
import { createDirectExpensePaymentWithRetry } from "../services/directExpensePayment.service.js";
import { computeAuthoritativeWeddingLedger } from "../services/financialLedger.service.js";

export function createFinanceRouter(prisma: PrismaClient): Router {
  const router = Router();
  const billingService = new ClientBillingService(prisma);
  const settlementService = new VendorSettlementService(prisma);

  // -------------------------------------------------------------
  // CLIENT MILESTONES & INVOICES
  // -------------------------------------------------------------

  router.get("/milestones/:weddingId", async (req: Request, res: Response) => {
    try {
      const milestones = await billingService.listMilestonesForWedding(req.params.weddingId);
      res.json(milestones);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list milestones" });
    }
  });

  router.post("/milestones", async (req: Request, res: Response) => {
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

  router.get("/invoices/:weddingId", async (req: Request, res: Response) => {
    try {
      const invoices = await billingService.listInvoicesForWedding(req.params.weddingId);
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list invoices" });
    }
  });

  router.get("/invoices/detail/:id", async (req: Request, res: Response) => {
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

  router.post("/invoices", async (req: Request, res: Response) => {
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
        totalAmountPaise: totalAmountPaise ? BigInt(totalAmountPaise) : undefined as any,
        milestoneIds,
        additionalChargeIds
      });
      res.status(201).json(invoice);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to create invoice" });
    }
  });

  router.post("/client-payments", async (req: Request, res: Response) => {
    try {
      const { clientInvoiceId, amountPaise, paymentMethod, transactionReference, status, notes } =
        req.body;

      if (!clientInvoiceId || !amountPaise || !paymentMethod || !transactionReference) {
        return res.status(400).json({ error: "Missing required payment fields" });
      }

      const payment = await billingService.recordClientPayment({
        clientInvoiceId,
        amountPaise: BigInt(amountPaise),
        paymentMethod,
        transactionReference,
        status,
        notes
      });
      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record client payment" });
    }
  });

  router.put("/client-payments/:id/clear", async (req: Request, res: Response) => {
    try {
      const payment = await billingService.markPaymentCleared(req.params.id);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to mark payment cleared" });
    }
  });

  // -------------------------------------------------------------
  // VENDOR BILLS & SETTLEMENT PAYMENTS
  // -------------------------------------------------------------

  router.get("/bills/:weddingId", async (req: Request, res: Response) => {
    try {
      const bills = await settlementService.listBillsForWedding(req.params.weddingId);
      res.json(bills);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list vendor bills" });
    }
  });

  router.get("/bills/detail/:id", async (req: Request, res: Response) => {
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

  router.post("/bills", async (req: Request, res: Response) => {
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

  router.post("/bills/:id/reconcile", async (req: Request, res: Response) => {
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

  router.post("/vendor-payments", async (req: Request, res: Response) => {
    try {
      const {
        vendorBillId,
        paymentType,
        amountPaise,
        paymentMethod,
        transactionReference,
        status,
        notes
      } = req.body;

      if (!vendorBillId || !paymentType || !amountPaise || !paymentMethod || !transactionReference) {
        return res.status(400).json({ error: "Missing required vendor payment fields" });
      }

      const payment = await settlementService.recordVendorPayment({
        vendorBillId,
        paymentType,
        amountPaise: BigInt(amountPaise),
        paymentMethod,
        transactionReference,
        status,
        notes
      });
      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record vendor payment" });
    }
  });

  router.put("/vendor-payments/:id/clear", async (req: Request, res: Response) => {
    try {
      const payment = await settlementService.markVendorPaymentCleared(req.params.id);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to mark vendor payment cleared" });
    }
  });

  // -------------------------------------------------------------
  // ADDITIONAL CHARGES & DIRECT PAYMENTS
  // -------------------------------------------------------------

  router.get("/charges/:weddingId", async (req: Request, res: Response) => {
    try {
      const charges = await settlementService.listAdditionalChargesForWedding(
        req.params.weddingId
      );
      res.json(charges);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list additional charges" });
    }
  });

  router.post("/charges", async (req: Request, res: Response) => {
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
  router.post("/direct-payments", async (req: Request, res: Response) => {
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
  // AUTHORITATIVE FINANCIAL LEDGER
  // -------------------------------------------------------------

  router.get("/ledger/:weddingId", async (req: Request, res: Response) => {
    try {
      const report = await computeAuthoritativeWeddingLedger(prisma, req.params.weddingId);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to compute ledger" });
    }
  });

  return router;
}
