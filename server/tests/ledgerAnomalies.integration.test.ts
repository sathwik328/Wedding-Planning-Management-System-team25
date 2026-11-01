import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computeAuthoritativeWeddingLedger } from "../src/services/financialLedger.service.js";

const prisma = new PrismaClient();

describe("Ledger Consistency Anomaly Reporting Integration Test", () => {
  const weddingId = "int-test-anomalies-wedding-uuid";

  beforeEach(async () => {
    // Teardown
    await prisma.directExpensePayment.deleteMany({ where: { additionalCharge: { weddingId } } });
    await prisma.additionalCharge.deleteMany({ where: { weddingId } });
    await prisma.vendorPayment.deleteMany({ where: { vendorBill: { weddingVendor: { weddingId } } } });
    await prisma.vendorBill.deleteMany({ where: { weddingVendor: { weddingId } } });
    await prisma.weddingVendor.deleteMany({ where: { weddingId } });
    await prisma.clientPayment.deleteMany({ where: { clientInvoice: { weddingId } } });
    await prisma.clientInvoice.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });

    // Seed master wedding
    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Anomaly Audit Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-20"),
        endDate: new Date("2026-11-23"),
        primaryCity: "Jaipur",
        venueName: "City Palace",
        totalBudgetPaise: 3000000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Karan",
            partnerTwoName: "Simran",
            email: "karan.simran@test.com",
            phone: "+919876599999"
          }
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Detects and reports all anomaly types without altering raw ledger figures", async () => {
    // 1. INVOICE ANOMALY 1: Marked PAID with Cleared Shortfall
    // Invoiced ₹10 Lakhs, marked PAID, but cleared payments sum to only ₹6 Lakhs
    const invoiceShortfall = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-ANOMALY-SHORTFALL",
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(),
        subtotalPaise: 100000000n, // ₹10 Lakhs
        totalAmountPaise: 100000000n,
        status: "PAID" // INCONSISTENT STATUS
      }
    });

    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoiceShortfall.id,
        amountPaise: 60000000n, // Only ₹6 Lakhs cleared
        paymentMethod: "NEFT_RTGS",
        transactionReference: "CLEARED-SHORT-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // 2. INVOICE ANOMALY 2: Cleared Payments Exceed Invoiced Total
    // Invoiced ₹2 Lakhs, but client cleared ₹2.5 Lakhs (₹50,000 overpayment)
    const invoiceOverpaid = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-ANOMALY-OVERPAID",
        invoiceType: "SUPPLEMENTARY_EXTRAS",
        dueDate: new Date(),
        subtotalPaise: 20000000n, // ₹2 Lakhs
        totalAmountPaise: 20000000n,
        status: "PAID"
      }
    });

    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoiceOverpaid.id,
        amountPaise: 25000000n, // ₹2.5 Lakhs cleared
        paymentMethod: "NEFT_RTGS",
        transactionReference: "CLEARED-OVER-002",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // 3. VENDOR BILL ANOMALIES
    const vendor = await prisma.vendor.create({
      data: {
        businessName: "Jaipur Sound & Lights",
        category: "SOUND_LIGHT",
        contactPerson: "Sunil Sound",
        phone: "+919876522222",
        email: "sunil@jaipursound.com",
        city: "Jaipur"
      }
    });

    const group = await prisma.quotationRequestGroup.create({
      data: {
        weddingId,
        title: "Sound Group",
        category: "SOUND_LIGHT",
        targetGuestCount: 400,
        status: "AWARDED"
      }
    });

    const weddingVendor = await prisma.weddingVendor.create({
      data: {
        weddingId,
        vendorId: vendor.id,
        quotationRequestGroupId: group.id,
        serviceCategory: "SOUND_LIGHT",
        agreedBaselineAmountPaise: 50000000n,
        status: "CONTRACTED"
      }
    });

    // Bill 1: Marked PAID with Cleared Shortfall
    // Billed ₹5 Lakhs, marked PAID, cleared payments sum to ₹3 Lakhs
    const billShortfall = await prisma.vendorBill.create({
      data: {
        weddingVendorId: weddingVendor.id,
        billNumber: "BILL-SHORT-001",
        baseAmountPaise: 50000000n,
        totalBilledPaise: 50000000n, // ₹5 Lakhs
        status: "PAID" // INCONSISTENT STATUS
      }
    });

    await prisma.vendorPayment.create({
      data: {
        vendorBillId: billShortfall.id,
        paymentType: "FINAL_SETTLEMENT",
        amountPaise: 30000000n, // Only ₹3 Lakhs cleared
        paymentMethod: "NEFT_RTGS",
        transactionReference: "VENDOR-SHORT-PAY-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // Bill 2: Cleared Payments Exceed Billed Total
    // Billed ₹1 Lakh, cleared payments sum to ₹1.2 Lakhs
    const billOverpaid = await prisma.vendorBill.create({
      data: {
        weddingVendorId: weddingVendor.id,
        billNumber: "BILL-OVER-002",
        baseAmountPaise: 10000000n,
        totalBilledPaise: 10000000n, // ₹1 Lakh
        status: "APPROVED"
      }
    });

    await prisma.vendorPayment.create({
      data: {
        vendorBillId: billOverpaid.id,
        paymentType: "ADVANCE",
        amountPaise: 12000000n, // ₹1.2 Lakhs cleared
        paymentMethod: "NEFT_RTGS",
        transactionReference: "VENDOR-OVER-PAY-002",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // 4. DIRECT CHARGE ANOMALY: Cleared Payments Exceed Total Cost
    const directCharge = await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Emergency ice blocks",
        reasonType: "MISC",
        quantityScaledUnits: 1000n,
        unitCostPaise: 1000000n,
        totalCostPaise: 1000000n, // ₹10,000 total cost
        vendorBillId: null,
        billedToClient: false,
        status: "SETTLED"
      }
    });

    await prisma.directExpensePayment.create({
      data: {
        additionalChargeId: directCharge.id,
        amountPaise: 1200000n, // ₹12,000 cleared (Exceeds ₹10,000 cost!)
        paymentMethod: "CASH",
        transactionReference: "CHARGE-OVER-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // 5. Compute the Authoritative Ledger
    const report = await computeAuthoritativeWeddingLedger(prisma, weddingId);

    // --- ASSERTIONS: ZERO SUPPRESSION OF RAW FIGURES ---
    expect(report.accrual.invoicedClientRevenuePaise).toBe("120000000");
    expect(report.cashFlow.clearedClientInflowsPaise).toBe("85000000");
    expect(report.accrual.recognizedVendorExpensesPaise).toBe("60000000");
    expect(report.cashFlow.clearedVendorOutflowsPaise).toBe("42000000");
    expect(report.accrual.directAgencyExpensesPaise).toBe("1000000");
    expect(report.cashFlow.clearedDirectExpensesPaise).toBe("1200000");

    // --- ASSERTIONS: ANOMALY REPORTING ---
    const anomalyCodes = report.auditAnomalies.map((a) => a.code);

    expect(anomalyCodes).toContain("INVOICE_PAID_STATUS_WITH_CLEARED_SHORTFALL");
    expect(anomalyCodes).toContain("INVOICE_CLEARED_PAYMENTS_EXCEED_INVOICED_TOTAL");
    expect(anomalyCodes).toContain("BILL_PAID_STATUS_WITH_CLEARED_SHORTFALL");
    expect(anomalyCodes).toContain("BILL_CLEARED_PAYMENTS_EXCEED_BILLED_TOTAL");
    expect(anomalyCodes).toContain("CHARGE_CLEARED_PAYMENTS_EXCEED_TOTAL_COST");

    const invoiceShortfallAnomaly = report.auditAnomalies.find(
      (a) => a.code === "INVOICE_PAID_STATUS_WITH_CLEARED_SHORTFALL"
    );
    expect(invoiceShortfallAnomaly?.discrepancyPaise).toBe("40000000"); // ₹4 Lakhs shortfall

    const billOverpaidAnomaly = report.auditAnomalies.find(
      (a) => a.code === "BILL_CLEARED_PAYMENTS_EXCEED_BILLED_TOTAL"
    );
    expect(billOverpaidAnomaly?.discrepancyPaise).toBe("2000000"); // ₹20,000 overpayment
  });
});
