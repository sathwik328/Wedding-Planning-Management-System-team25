import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createDirectExpensePaymentWithRetry,
  PaymentCeilingExceededError
} from "../src/services/directExpensePayment.service.js";

const prisma = new PrismaClient();

describe("DirectExpensePayment Transactional Service Integration Test", () => {
  const weddingId = "int-test-direct-payment-wedding-uuid";
  const foreignWeddingId = "int-test-foreign-wedding-uuid";
  let directChargeId: string;

  beforeEach(async () => {
    // Teardown
    await prisma.directExpensePayment.deleteMany({
      where: { additionalCharge: { weddingId: { in: [weddingId, foreignWeddingId] } } }
    });
    await prisma.additionalCharge.deleteMany({
      where: { weddingId: { in: [weddingId, foreignWeddingId] } }
    });
    await prisma.wedding.deleteMany({
      where: { id: { in: [weddingId, foreignWeddingId] } }
    });

    // Seed master wedding and foreign wedding
    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Direct Payment Test Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-25"),
        endDate: new Date("2026-11-28"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        totalBudgetPaise: 2500000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Aman",
            partnerTwoName: "Riya",
            email: "aman.riya@test.com",
            phone: "+919876540001"
          }
        }
      }
    });

    await prisma.wedding.create({
      data: {
        id: foreignWeddingId,
        title: "Foreign Security Test Wedding",
        packageType: "PARTIAL_DAY_OF",
        startDate: new Date("2026-11-25"),
        endDate: new Date("2026-11-28"),
        primaryCity: "Jaipur",
        venueName: "City Palace",
        totalBudgetPaise: 1000000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Foreign1",
            partnerTwoName: "Foreign2",
            email: "foreign@test.com",
            phone: "+919876540002"
          }
        }
      }
    });

    // Seed direct agency expense of ₹8,500 (850000 paise)
    const charge = await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Airport guest transfer highway tolls",
        reasonType: "MISC",
        quantityScaledUnits: 1000n,
        unitCostPaise: 850000n,
        totalCostPaise: 850000n, // ₹8,500 total cost
        vendorBillId: null,      // Direct agency charge
        billedToClient: true,
        status: "PENDING"
      }
    });
    directChargeId = charge.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Test 1: Supports partial cleared payments and reserves pending commitments", async () => {
    // Payment 1: Partial CLEARED payment of ₹4,000 (400000 paise)
    const payment1 = await createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: directChargeId,
      amountPaise: 400000n,
      paymentMethod: "CASH",
      transactionReference: "CASH-REC-001",
      status: "CLEARED"
    });

    expect(payment1.status).toBe("CLEARED");
    expect(payment1.amountPaise).toBe(400000n);

    // Payment 2: Partial PENDING payment of ₹3,000 (300000 paise)
    const payment2 = await createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: directChargeId,
      amountPaise: 300000n,
      paymentMethod: "COMPANY_CARD",
      transactionReference: "CARD-REC-002",
      status: "PENDING"
    });

    expect(payment2.status).toBe("PENDING");

    // Total committed is now ₹4,000 + ₹3,000 = ₹7,000.
    // Remaining available capacity is ₹8,500 - ₹7,000 = ₹1,500.

    // Payment 3: Attempting to disburse ₹2,000 (exceeds ₹1,500 capacity) must throw PaymentCeilingExceededError
    await expect(
      createDirectExpensePaymentWithRetry(prisma, {
        weddingId,
        additionalChargeId: directChargeId,
        amountPaise: 200000n, // ₹2,000
        paymentMethod: "UPI",
        transactionReference: "UPI-REC-003",
        status: "PENDING"
      })
    ).rejects.toThrow(PaymentCeilingExceededError);

    // Payment 4: Exact remaining capacity of ₹1,500 succeeds
    const payment4 = await createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: directChargeId,
      amountPaise: 150000n, // ₹1,500
      paymentMethod: "UPI",
      transactionReference: "UPI-REC-004",
      status: "CLEARED"
    });

    expect(payment4.status).toBe("CLEARED");
  });

  it("Test 2: Rejects cross-wedding injection attempts", async () => {
    // Attempting to pay weddingId's charge while claiming foreignWeddingId
    await expect(
      createDirectExpensePaymentWithRetry(prisma, {
        weddingId: foreignWeddingId, // MISMATCH
        additionalChargeId: directChargeId,
        amountPaise: 100000n,
        paymentMethod: "CASH",
        transactionReference: "MISMATCH-REF-001",
        status: "CLEARED"
      })
    ).rejects.toThrow(/Security boundary violation/i);
  });

  it("Test 3: Genuine Concurrency Scenario A — Two simultaneous payment requests attempt to consume more than available charge capacity", async () => {
    // Total available charge capacity is ₹8,500.
    // Launch two simultaneous requests of ₹5,000 each (Total ₹10,000 > ₹8,500).
    const promise1 = createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: directChargeId,
      amountPaise: 500000n, // ₹5,000
      paymentMethod: "CASH",
      transactionReference: "SIMULTANEOUS-REF-A",
      status: "CLEARED"
    });

    const promise2 = createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: directChargeId,
      amountPaise: 500000n, // ₹5,000
      paymentMethod: "UPI",
      transactionReference: "SIMULTANEOUS-REF-B",
      status: "CLEARED"
    });

    const results = await Promise.allSettled([promise1, promise2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Expected:
    // 1. Exactly one payment succeeds.
    expect(fulfilled.length).toBe(1);

    // 2. The other receives PaymentCeilingExceededError after retrying and re-reading latest committed payments.
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(PaymentCeilingExceededError);

    // 3. No duplicate records are created: database has strictly 1 payment record
    const paymentRecords = await prisma.directExpensePayment.findMany({
      where: { additionalChargeId: directChargeId }
    });
    expect(paymentRecords.length).toBe(1);

    // 4. The final committed amount does not exceed the charge total (₹5,000 <= ₹8,500)
    expect(paymentRecords[0].amountPaise).toBe(500000n);
  });
});
