import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { VendorSettlementService } from "../src/services/vendorSettlement.service.js";

const prisma = new PrismaClient();
const service = new VendorSettlementService(prisma);

describe("Vendor Settlement & Bill Reconciliation Integration Tests", () => {
  const weddingId = "int-test-settlement-wedding-uuid";
  const coupleId = "int-test-settlement-couple-uuid";
  let vendorId: string;
  let rfqGroupId: string;
  let weddingVendorId: string;

  beforeEach(async () => {
    // Teardown
    await prisma.vendorPayment.deleteMany({
      where: { vendorBill: { weddingVendor: { weddingId } } }
    });
    await prisma.additionalCharge.deleteMany({ where: { weddingId } });
    await prisma.vendorBill.deleteMany({
      where: { weddingVendor: { weddingId } }
    });
    await prisma.weddingVendor.deleteMany({ where: { weddingId } });
    await prisma.quotationRequestGroup.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });
    await prisma.couple.deleteMany({ where: { id: coupleId } });

    await prisma.couple.create({
      data: {
        id: coupleId,
        partnerOneName: "Yuvraj Shekhawat",
        partnerTwoName: "Devika Kumari",
        email: "yuvraj.devika@test.in",
        phone: "+919829999030"
      }
    });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        coupleId,
        title: "The Royal Wedding of Yuvraj & Devika",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-25T10:00:00Z"),
        endDate: new Date("2026-11-28T18:00:00Z"),
        primaryCity: "Jaipur",
        venueName: "City Palace",
        targetGuestCount: 500,
        totalBudgetPaise: 3500000000n,
        status: "ACTIVE_EXECUTION"
      }
    });

    const vendor = await prisma.vendor.upsert({
      where: { id: "test-vendor-floral-decor" },
      update: {},
      create: {
        id: "test-vendor-floral-decor",
        businessName: "Mewar Royal Florals",
        category: "DECOR_FLORAL",
        contactPerson: "Sunita Mewari",
        phone: "+919829999031",
        email: "sunita@mewarflorals.com",
        city: "Jaipur"
      }
    });
    vendorId = vendor.id;

    const rfqGroup = await prisma.quotationRequestGroup.create({
      data: {
        weddingId,
        title: "City Palace Heritage Floral Rigging & Mandap",
        category: "DECOR_FLORAL",
        targetGuestCount: 500,
        status: "AWARDED"
      }
    });
    rfqGroupId = rfqGroup.id;

    // Contracted Wedding Vendor with Agreed Baseline of ₹18,00,000 (180000000 paise)
    const wv = await prisma.weddingVendor.create({
      data: {
        weddingId,
        vendorId,
        quotationRequestGroupId: rfqGroupId,
        serviceCategory: "DECOR_FLORAL",
        agreedBaselineAmountPaise: 180000000n, // ₹18 Lakhs
        status: "CONTRACTED"
      }
    });
    weddingVendorId = wv.id;
  });

  it("handles vendor bill creation, agreed baseline quotation reconciliation with variance detection, and advance/final payments", async () => {
    // 1. Create Additional Charge for Extended Decor Lighting (₹1,50,000)
    const extraCharge = await service.createAdditionalCharge({
      weddingId,
      description: "Additional night lighting trussing for Sangeet lawn",
      reasonType: "EXTENDED_HOURS",
      quantityScaledUnits: 3000n, // 3 hours
      unitCostPaise: 5000000n, // ₹50,000/hr
      totalCostPaise: 15000000n, // ₹1,50,000
      vendorId,
      weddingVendorId
    });

    expect(extraCharge.id).toBeDefined();

    // 2. Submit Vendor Bill: Base ₹18,00,000 + Extras ₹1,50,000 = ₹19,50,000 Total
    const bill = await service.createVendorBill({
      weddingVendorId,
      billNumber: "BILL-MRF-2026-001",
      baseAmountPaise: 180000000n,
      extraAmountPaise: 15000000n,
      totalBilledPaise: 195000000n,
      additionalChargeIds: [extraCharge.id]
    });

    expect(bill).toBeDefined();
    expect(bill?.status).toBe("SUBMITTED");
    expect(bill?.totalBilledPaise).toBe(195000000n);

    // Verify additional charge was linked to the bill (anti-double-counting)
    const linkedCharge = await prisma.additionalCharge.findUnique({
      where: { id: extraCharge.id }
    });
    expect(linkedCharge?.vendorBillId).toBe(bill!.id);

    // 3. Reconcile Bill against agreed quotation baseline (₹18 Lakhs baseline vs ₹19.5 Lakhs billed)
    const recon = await service.reconcileBill({
      billId: bill!.id,
      varianceReason: "Approved 3 hours extended lawn trussing lighting",
      reconciliationNotes: "Approved by Lead Planner; invoiced to couple in extras bill"
    });

    expect(recon.reconciled).toBe(true);
    expect(recon.isOverBudget).toBe(true);
    expect(recon.variancePaise).toBe("15000000"); // +₹1.5 Lakhs variance
    expect(recon.baselineAgreedPaise).toBe("180000000");
    expect(recon.totalBilledPaise).toBe("195000000");

    // 4. Record Vendor Advance Payment: ₹10,00,000 (100000000 paise)
    const advance = await service.recordVendorPayment({
      vendorBillId: bill!.id,
      paymentType: "ADVANCE",
      amountPaise: 100000000n,
      paymentMethod: "NEFT_RTGS",
      transactionReference: "TX-VENDOR-ADV-001",
      status: "CLEARED"
    });

    expect(advance.status).toBe("CLEARED");
    expect(advance.paymentType).toBe("ADVANCE");

    // 5. Record Final Settlement Payment: ₹9,50,000 (95000000 paise)
    const finalSettlement = await service.recordVendorPayment({
      vendorBillId: bill!.id,
      paymentType: "FINAL_SETTLEMENT",
      amountPaise: 95000000n,
      paymentMethod: "BANK_TRANSFER",
      transactionReference: "TX-VENDOR-FINAL-002",
      status: "CLEARED"
    });

    expect(finalSettlement.status).toBe("CLEARED");

    // Bill is now fully paid (₹10L + ₹9.5L = ₹19.5L)
    const paidBill = await service.getBillById(bill!.id);
    expect(paidBill?.status).toBe("PAID");
  });
});
