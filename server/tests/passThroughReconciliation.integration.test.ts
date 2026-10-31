import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computeAuthoritativeWeddingLedger } from "../src/services/financialLedger.service.js";

const prisma = new PrismaClient();

describe("Pass-Through Reconciliation & Anti-Double-Counting Integration Test", () => {
  const weddingId = "int-test-pass-through-reconciliation-uuid";

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
        title: "Pass-Through Reconciliation Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-15"),
        endDate: new Date("2026-11-18"),
        primaryCity: "Udaipur",
        venueName: "Jagmandir Island Palace",
        totalBudgetPaise: 3500000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Rohan",
            partnerTwoName: "Pooja",
            email: "rohan.pooja@test.com",
            phone: "+919876500002"
          }
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Verifies direct pass-through yields zero margin and vendor-bill charges are not counted twice", async () => {
    // 1. Supplementary Client Invoice for direct pass-through tolls (₹8,500)
    const tollInvoice = await prisma.clientInvoice.create({
      data: {
        weddingId,
        invoiceNumber: "INV-SUPP-TOLLS-001",
        invoiceType: "SUPPLEMENTARY_EXTRAS",
        dueDate: new Date(),
        subtotalPaise: 850000n, // ₹8,500
        totalAmountPaise: 850000n,
        status: "ISSUED"
      }
    });

    // 2. Direct Agency Expense of ₹8,500 linked to supplementary invoice
    await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Airport guest transfer highway tolls",
        reasonType: "MISC",
        quantityScaledUnits: 1000n,
        unitCostPaise: 850000n,
        totalCostPaise: 850000n, // ₹8,500
        vendorBillId: null,      // Direct agency expense
        clientInvoiceId: tollInvoice.id,
        billedToClient: true,
        status: "INVOICED"
      }
    });

    // 3. Vendor Setup for Catering
    const vendor = await prisma.vendor.create({
      data: {
        businessName: "Udaipur Royal Caterers",
        category: "CATERING",
        contactPerson: "Mahesh Chef",
        phone: "+919876511111",
        email: "mahesh@udaipurcat.com",
        city: "Udaipur"
      }
    });

    const group = await prisma.quotationRequestGroup.create({
      data: {
        weddingId,
        title: "Catering 400 Guests",
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
        agreedBaselineAmountPaise: 250000000n, // ₹25 Lakhs
        status: "CONTRACTED"
      }
    });

    // 4. Caterer Final Bill: ₹25 Lakhs base + ₹2.1 Lakhs extra (+60 plates) = ₹27.1 Lakhs
    const catererBill = await prisma.vendorBill.create({
      data: {
        weddingVendorId: weddingVendor.id,
        billNumber: "BILL-CAT-FINAL-001",
        baseAmountPaise: 250000000n,
        extraAmountPaise: 21000000n,
        totalBilledPaise: 271000000n, // ₹27.1 Lakhs
        status: "APPROVED",
        reconciled: true
      }
    });

    // 5. Vendor-Bill Linked Additional Charge (+60 plates = ₹2.1 Lakhs)
    await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "60 Extra Banquet Guest Plates @ ₹3,500",
        reasonType: "EXTRA_GUESTS",
        quantityScaledUnits: 60000n,
        unitCostPaise: 350000n,
        totalCostPaise: 21000000n, // ₹2.1 Lakhs
        vendorId: vendor.id,
        weddingVendorId: weddingVendor.id,
        vendorBillId: catererBill.id, // LINKED TO VENDOR BILL
        billedToClient: true,
        status: "BILLED_BY_VENDOR"
      }
    });

    // 6. Execute the Ledger Service
    const report = await computeAuthoritativeWeddingLedger(prisma, weddingId);

    // --- VERIFICATIONS ---

    // A. Revenue recognizes exactly ₹8,500 from the supplementary invoice
    expect(report.accrual.invoicedClientRevenuePaise).toBe("850000");

    // B. Direct Agency Expenses recognizes strictly ₹8,500 (The tolls)
    expect(report.accrual.directAgencyExpensesPaise).toBe("850000");

    // C. Recognized Vendor Expenses recognizes strictly the Caterer Bill (₹27.1 Lakhs)
    expect(report.accrual.recognizedVendorExpensesPaise).toBe("271000000");

    // D. Proof of Anti-Double-Counting:
    // The ₹2.1 Lakhs extra charge linked to catererBill.id is NEVER added to directAgencyExpenses!
    expect(report.accrual.directAgencyExpensesPaise).not.toBe("21850000");
    expect(report.accrual.directAgencyExpensesPaise).toBe("850000");

    // E. Proof of Zero Gross Margin Pass-Through:
    // Revenue (₹8,500) minus Direct Pass-Through Expense (₹8,500) produces exactly ₹0 margin impact.
    // Operating Profit = Revenue (₹8.5K) - Vendor Bill (₹27.1L) - Direct Expense (₹8.5K) = -₹27.1 Lakhs
    expect(report.accrual.operatingProfitPaise).toBe("-271000000");
  });
});
