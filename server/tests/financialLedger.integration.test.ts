import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computeAuthoritativeWeddingLedger } from "../src/services/financialLedger.service.js";

const prisma = new PrismaClient();

describe("Financial Ledger Service Comprehensive Integration Test", () => {
  const weddingId = "int-test-ledger-wedding-uuid";

  beforeEach(async () => {
    // Clean up test data
    await prisma.directExpensePayment.deleteMany({ where: { additionalCharge: { weddingId } } });
    await prisma.additionalCharge.deleteMany({ where: { weddingId } });
    await prisma.teamWorkLog.deleteMany({ where: { weddingId } });
    await prisma.vendorPayment.deleteMany({ where: { vendorBill: { weddingVendor: { weddingId } } } });
    await prisma.vendorBill.deleteMany({ where: { weddingVendor: { weddingId } } });
    await prisma.weddingVendor.deleteMany({ where: { weddingId } });
    await prisma.clientPayment.deleteMany({ where: { clientInvoice: { weddingId } } });
    await prisma.clientInvoiceMilestone.deleteMany({ where: { invoice: { weddingId } } });
    await prisma.clientInvoice.deleteMany({ where: { weddingId } });
    await prisma.paymentMilestone.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });

    // Seed master wedding record
    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Financial Ledger Integration Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-04"),
        primaryCity: "Udaipur",
        venueName: "The Oberoi Udaivilas",
        totalBudgetPaise: 5000000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Vikram",
            partnerTwoName: "Ananya",
            email: "vikram.ananya@test.com",
            phone: "+919876543210"
          }
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Executes full financial ledger against database records across all 9 scenarios", async () => {
    // 1. Client Invoices
    const invoice1 = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-TEST-001",
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(),
        subtotalPaise: 300000000n, // ₹30 Lakhs
        totalAmountPaise: 300000000n,
        status: "ISSUED"
      }
    });

    const invoice2 = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-TEST-002",
        invoiceType: "SUPPLEMENTARY_EXTRAS",
        dueDate: new Date(),
        subtotalPaise: 20000000n, // ₹2 Lakhs
        totalAmountPaise: 20000000n,
        status: "ISSUED"
      }
    });

    // Scenario 1: Cleared Client Payment (₹15 Lakhs)
    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoice1.id,
        amountPaise: 150000000n,
        paymentMethod: "NEFT_RTGS",
        transactionReference: "CLEARED-CLIENT-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // Scenario 2: Pending Client Payment (₹5 Lakhs - Must NOT affect cash inflows)
    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoice1.id,
        amountPaise: 50000000n,
        paymentMethod: "CHEQUE",
        transactionReference: "PENDING-CLIENT-002",
        status: "PENDING"
      }
    });

    // Scenario 3: Failed Client Payment (₹2 Lakhs - Must NOT affect cash inflows)
    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoice2.id,
        amountPaise: 20000000n,
        paymentMethod: "BANK_TRANSFER",
        transactionReference: "FAILED-CLIENT-003",
        status: "FAILED"
      }
    });

    // 2. Vendor Setup
    const vendor = await prisma.vendor.create({
      data: {
        businessName: "Royal Jaipur Caterers",
        category: "CATERING",
        contactPerson: "Rajesh Chef",
        phone: "+919876500001",
        email: "rajesh@royalcat.com",
        city: "Jaipur"
      }
    });

    const group = await prisma.quotationRequestGroup.create({
      data: {
        weddingId,
        title: "Catering RFQ Group",
        category: "CATERING",
        targetGuestCount: 400,
        status: "AWARDED"
      }
    });

    const weddingVendor = await prisma.weddingVendor.create({
      data: {
        weddingId,
        vendorId: vendor.id,
        quotationRequestGroupId: group.id,
        serviceCategory: "CATERING",
        agreedBaselineAmountPaise: 200000000n, // ₹20 Lakhs baseline
        status: "CONTRACTED"
      }
    });

    // Scenario 8: Vendor Bill Approved but not yet paid (Bill 1: ₹20 Lakhs)
    const bill1 = await prisma.vendorBill.create({
      data: {
        weddingVendorId: weddingVendor.id,
        billNumber: "BILL-CAT-001",
        baseAmountPaise: 200000000n,
        totalBilledPaise: 200000000n, // ₹20 Lakhs
        status: "APPROVED",
        reconciled: true
      }
    });

    // Scenario 4: Cleared Vendor Payment (Advance of ₹6 Lakhs)
    await prisma.vendorPayment.create({
      data: {
        vendorBillId: bill1.id,
        paymentType: "ADVANCE",
        amountPaise: 60000000n,
        paymentMethod: "NEFT_RTGS",
        transactionReference: "CLEARED-VENDOR-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // Scenario 5: Pending Vendor Payment (₹4 Lakhs - Must NOT affect cash outflows)
    await prisma.vendorPayment.create({
      data: {
        vendorBillId: bill1.id,
        paymentType: "FINAL_SETTLEMENT",
        amountPaise: 40000000n,
        paymentMethod: "NEFT_RTGS",
        transactionReference: "PENDING-VENDOR-002",
        status: "PENDING"
      }
    });

    // Scenario 6: Failed Vendor Payment (₹1 Lakh - Must NOT affect cash outflows)
    await prisma.vendorPayment.create({
      data: {
        vendorBillId: bill1.id,
        paymentType: "FINAL_SETTLEMENT",
        amountPaise: 10000000n,
        paymentMethod: "BANK_TRANSFER",
        transactionReference: "FAILED-VENDOR-003",
        status: "FAILED"
      }
    });

    // Scenario 7: Direct Agency Additional Charges (Paid vs Unpaid via DirectExpensePayment)
    // Direct charge 1: Airport tolls ₹8,500 (Paid in cash with DirectExpensePayment CLEARED)
    const charge1 = await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Airport guest tolls",
        reasonType: "MISC",
        quantityScaledUnits: 1000n,
        unitCostPaise: 850000n,
        totalCostPaise: 850000n,
        vendorBillId: null, // Direct charge
        billedToClient: true
      }
    });

    await prisma.directExpensePayment.create({
      data: {
        additionalChargeId: charge1.id,
        amountPaise: 850000n,
        paymentMethod: "CASH",
        transactionReference: "DIRECT-TOLL-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // Direct charge 2: Emergency generator diesel ₹12,000 (Unpaid credit from local supplier)
    await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Emergency generator diesel",
        reasonType: "EMERGENCY_EQUIPMENT",
        quantityScaledUnits: 1000n,
        unitCostPaise: 1200000n,
        totalCostPaise: 1200000n,
        vendorBillId: null, // Direct charge
        billedToClient: false
      }
    });

    // 3. Execute the Ledger Service against actual database records
    const report = await computeAuthoritativeWeddingLedger(prisma, weddingId);

    // --- ASSERTIONS ---

    // 1. Accrual Revenue: ₹30L + ₹2L = ₹32 Lakhs
    expect(report.accrual.invoicedClientRevenuePaise).toBe("320000000");

    // 2. Recognized Vendor Expenses: ₹20 Lakhs
    expect(report.accrual.recognizedVendorExpensesPaise).toBe("200000000");

    // 3. Direct Agency Expenses (Both pass-through ₹8.5K + unbilled ₹12K): ₹20,500
    expect(report.accrual.directAgencyExpensesPaise).toBe("2050000");

    // 4. Operating Profit: ₹32L - ₹20L - ₹0.205L = ₹11,79,500
    expect(report.accrual.operatingProfitPaise).toBe("117950000");

    // 5. Cleared Cash Inflows: STRICTLY ₹15 Lakhs (Pending ₹5L and Failed ₹2L excluded!)
    expect(report.cashFlow.clearedClientInflowsPaise).toBe("150000000");

    // 6. Cleared Vendor Outflows: STRICTLY ₹6 Lakhs (Pending ₹4L and Failed ₹1L excluded!)
    expect(report.cashFlow.clearedVendorOutflowsPaise).toBe("60000000");

    // 7. Cleared Direct Outflows: STRICTLY ₹8,500 (Unpaid ₹12,000 diesel excluded!)
    expect(report.cashFlow.clearedDirectExpensesPaise).toBe("850000");

    // 8. Net Actual Cash Flow: ₹15L - ₹6L - ₹0.085L = ₹8,91,500
    expect(report.cashFlow.netActualCashFlowPaise).toBe("89150000");

    // 9. Working Capital Positions
    expect(report.workingCapital.outstandingClientReceivablesPaise).toBe("170000000");
    expect(report.workingCapital.clientCreditBalancePaise).toBe("0");
    expect(report.workingCapital.pendingClientPaymentsPaise).toBe("50000000");
    expect(report.workingCapital.unpaidVendorLiabilitiesPaise).toBe("140000000");
    expect(report.workingCapital.vendorAdvanceCreditPaise).toBe("0");
    expect(report.workingCapital.pendingVendorPaymentsPaise).toBe("40000000");
    expect(report.workingCapital.unpaidDirectExpensesPaise).toBe("1200000"); // ₹12K unpaid diesel
  });

  it("Scenario 9: Overpayments and credit balances are handled explicitly and decoupled", async () => {
    const invoice = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-OVERPAY-001",
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date(),
        subtotalPaise: 50000000n, // ₹5 Lakhs
        totalAmountPaise: 50000000n,
        status: "PAID"
      }
    });

    await prisma.clientPayment.create({
      data: {
        clientInvoiceId: invoice.id,
        amountPaise: 70000000n, // ₹7 Lakhs cleared
        paymentMethod: "NEFT_RTGS",
        transactionReference: "OVERPAY-REF-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    const report = await computeAuthoritativeWeddingLedger(prisma, weddingId);

    expect(report.workingCapital.outstandingClientReceivablesPaise).toBe("0");
    expect(report.workingCapital.clientCreditBalancePaise).toBe("20000000"); // ₹2 Lakhs credit balance
  });
});
