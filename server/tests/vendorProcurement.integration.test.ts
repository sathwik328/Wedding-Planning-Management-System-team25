import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { VendorProcurementService } from "../src/services/vendorProcurement.service.js";

const prisma = new PrismaClient();
const service = new VendorProcurementService(prisma);

describe("Vendor Procurement & RFQ Quotation Service Integration Tests", () => {
  const weddingId = "int-test-procurement-wedding-uuid";
  const coupleId = "int-test-procurement-couple-uuid";
  let vendor1Id: string;
  let vendor2Id: string;
  let vendor3Id: string;

  beforeEach(async () => {
    // Teardown previous test data
    await prisma.weddingVendor.deleteMany({ where: { weddingId } });
    await prisma.quotationRequestGroup.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });
    await prisma.couple.deleteMany({ where: { id: coupleId } });

    // Seed couple and wedding
    await prisma.couple.create({
      data: {
        id: coupleId,
        partnerOneName: "Vikram Rajput",
        partnerTwoName: "Gayatri Devi",
        email: "vikram.gayatri@test.in",
        phone: "+919829999001"
      }
    });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        coupleId,
        title: "The Royal Wedding of Vikram & Gayatri",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-20T10:00:00Z"),
        endDate: new Date("2026-11-23T18:00:00Z"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        targetGuestCount: 400,
        totalBudgetPaise: 3000000000n, // ₹3 Crores
        status: "PLANNING"
      }
    });

    // Seed 3 Catering Vendors
    const v1 = await prisma.vendor.upsert({
      where: { id: "test-vendor-caterer-1" },
      update: {},
      create: {
        id: "test-vendor-caterer-1",
        businessName: "Mewar Royal Kitchens",
        category: "CATERING",
        contactPerson: "Chef Vikram",
        phone: "+919829999011",
        email: "vikram@mewarkitchen.com",
        city: "Jaipur"
      }
    });
    vendor1Id = v1.id;

    const v2 = await prisma.vendor.upsert({
      where: { id: "test-vendor-caterer-2" },
      update: {},
      create: {
        id: "test-vendor-caterer-2",
        businessName: "Rajputana Haveli Banquets",
        category: "CATERING",
        contactPerson: "Chef Mahendra",
        phone: "+919829999012",
        email: "mahendra@rajputanabanquet.com",
        city: "Jaipur"
      }
    });
    vendor2Id = v2.id;

    const v3 = await prisma.vendor.upsert({
      where: { id: "test-vendor-caterer-3" },
      update: {},
      create: {
        id: "test-vendor-caterer-3",
        businessName: "Amber Heritage Gourmet",
        category: "CATERING",
        contactPerson: "Chef Sunita",
        phone: "+919829999013",
        email: "sunita@amberheritage.com",
        city: "Jaipur"
      }
    });
    vendor3Id = v3.id;
  });

  it("completes full 3-vendor RFQ workflow: group creation, line-by-line quote submission, comparison matrix, and winning vendor award", async () => {
    // 1. Create RFQ Group for 400-guest Royal Catering
    const group = await service.createRfqGroup({
      weddingId,
      title: "Royal Rajasthani Banquet & Multi-Cuisine Feast",
      category: "CATERING",
      targetGuestCount: 400,
      vendorIds: [vendor1Id, vendor2Id, vendor3Id],
      requirement: "Complete 3-day haveli breakfast, royal sangeet dinner, and gala reception thali"
    });

    expect(group).toBeDefined();
    expect(group?.status).toBe("OPEN");
    expect(group?.requests.length).toBe(3);

    const req1 = group!.requests.find((r) => r.vendorId === vendor1Id)!;
    const req2 = group!.requests.find((r) => r.vendorId === vendor2Id)!;
    const req3 = group!.requests.find((r) => r.vendorId === vendor3Id)!;

    // 2. Submit Quotation 1: Mewar Royal Kitchens
    // Base ₹28,00,000 (₹28,00,000 * 100 = 280000000 paise)
    // ₹4,500/plate, ₹50,000 extra hour
    const quote1 = await service.submitQuotation({
      vendorRequestId: req1.id,
      vendorId: vendor1Id,
      quoteReference: "Q-MEWAR-2026-01",
      menuDescription: "Gold leaf royal thali with 8 Rajasthani live stations & silver service",
      pricePerPlatePaise: 450000n, // ₹4,500
      baseAmountPaise: 280000000n, // ₹28,00,000
      extraHourRatePaise: 5000000n, // ₹50,000
      lineItems: [
        {
          description: "400 Pax Royal Sangeet Banquet",
          quantityScaledUnits: 400000n, // 400.000 units
          unitPricePaise: 450000n,
          totalPricePaise: 180000000n
        },
        {
          description: "Live Dal Baati & Mithai Terrace Counters",
          quantityScaledUnits: 1000n,
          unitPricePaise: 100000000n,
          totalPricePaise: 100000000n
        }
      ]
    });

    expect(quote1.id).toBeDefined();
    expect(quote1.lineItems.length).toBe(2);

    // 3. Submit Quotation 2: Rajputana Haveli Banquets
    // Base ₹25,00,000
    // ₹4,000/plate, ₹40,000 extra hour
    const quote2 = await service.submitQuotation({
      vendorRequestId: req2.id,
      vendorId: vendor2Id,
      quoteReference: "Q-RAJPUTANA-2026-02",
      menuDescription: "Traditional Marwari spread with charcoal sigri grills & saffron desserts",
      pricePerPlatePaise: 400000n, // ₹4,000
      baseAmountPaise: 250000000n, // ₹25,00,000
      extraHourRatePaise: 4000000n, // ₹40,000
      lineItems: [
        {
          description: "400 Pax Marwari Feast",
          quantityScaledUnits: 400000n,
          unitPricePaise: 400000n,
          totalPricePaise: 160000000n
        },
        {
          description: "Copper Handi Service & Clay Kiln Bread Stations",
          quantityScaledUnits: 1000n,
          unitPricePaise: 90000000n,
          totalPricePaise: 90000000n
        }
      ]
    });

    // 4. Submit Quotation 3: Amber Heritage Gourmet
    // Base ₹32,00,000
    // ₹5,200/plate, ₹60,000 extra hour
    const quote3 = await service.submitQuotation({
      vendorRequestId: req3.id,
      vendorId: vendor3Id,
      quoteReference: "Q-AMBER-2026-03",
      menuDescription: "Pan-Indian royal heritage buffet with artisanal bakery & mocktail bar",
      pricePerPlatePaise: 520000n, // ₹5,200
      baseAmountPaise: 320000000n, // ₹32,00,000
      extraHourRatePaise: 6000000n, // ₹60,000
      lineItems: [
        {
          description: "400 Pax Heritage Buffet",
          quantityScaledUnits: 400000n,
          unitPricePaise: 520000n,
          totalPricePaise: 208000000n
        },
        {
          description: "Liquid Nitrogen Dessert Bar & Mocktails",
          quantityScaledUnits: 1000n,
          unitPricePaise: 112000000n,
          totalPricePaise: 112000000n
        }
      ]
    });

    // 5. Query Three-Vendor Comparison Matrix
    const matrix = await service.getQuotationComparisonMatrix(group!.id);
    expect(matrix.quotations.length).toBe(3);
    expect(matrix.lowestBaseAmountPaise).toBe("250000000"); // ₹25 Lakhs
    expect(matrix.highestBaseAmountPaise).toBe("320000000"); // ₹32 Lakhs
    expect(matrix.spreadPaise).toBe("70000000"); // ₹7 Lakhs spread

    // Assert line-by-line inclusions and per-plate pricing
    const q1Matrix = matrix.quotations.find((q) => q.quotationId === quote1.id)!;
    expect(q1Matrix.pricePerPlatePaise).toBe("450000");
    expect(q1Matrix.extraHourRatePaise).toBe("5000000");
    expect(q1Matrix.lineItems.length).toBe(2);

    // 6. Select Winning Vendor: Award Rajputana Haveli Banquets (Quote 2)
    const awardResult = await service.awardWinningQuotation(group!.id, quote2.id);
    expect(awardResult.rfqGroupId).toBe(group!.id);
    expect(awardResult.awardedQuotationId).toBe(quote2.id);
    expect(awardResult.rejectedRequestCount).toBe(2);

    // 7. Verify atomic status transitions
    const updatedGroup = await prisma.quotationRequestGroup.findUnique({
      where: { id: group!.id },
      include: { requests: true }
    });
    expect(updatedGroup?.status).toBe("AWARDED");
    expect(updatedGroup?.awardedQuotationId).toBe(quote2.id);

    // Winning request status is AWARDED
    const winningReq = updatedGroup?.requests.find((r) => r.vendorId === vendor2Id);
    expect(winningReq?.status).toBe("AWARDED");

    // Competing requests are closed as REJECTED_COMPETING_AWARDED
    const competing1 = updatedGroup?.requests.find((r) => r.vendorId === vendor1Id);
    const competing3 = updatedGroup?.requests.find((r) => r.vendorId === vendor3Id);
    expect(competing1?.status).toBe("REJECTED_COMPETING_AWARDED");
    expect(competing3?.status).toBe("REJECTED_COMPETING_AWARDED");

    // 8. Verify WeddingVendor is linked to the wedding with agreed baseline amount
    const weddingVendor = await prisma.weddingVendor.findUnique({
      where: { id: awardResult.weddingVendorId },
      include: { vendor: true, quotation: true }
    });
    expect(weddingVendor).toBeDefined();
    expect(weddingVendor?.weddingId).toBe(weddingId);
    expect(weddingVendor?.vendorId).toBe(vendor2Id);
    expect(weddingVendor?.serviceCategory).toBe("CATERING");
    expect(weddingVendor?.agreedBaselineAmountPaise).toBe(250000000n);
    expect(weddingVendor?.status).toBe("CONTRACTED");

    // 9. Re-awarding should be rejected
    await expect(service.awardWinningQuotation(group!.id, quote1.id)).rejects.toThrow(
      /already awarded/i
    );
  });
});
