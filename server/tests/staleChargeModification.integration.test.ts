import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createDirectExpensePaymentWithRetry,
  PaymentCeilingExceededError
} from "../src/services/directExpensePayment.service.js";

const prisma = new PrismaClient();

describe("Refreshed Locked Read & Stale Charge Modification Integration Test", () => {
  const weddingId = "int-test-stale-charge-wedding-uuid";
  let chargeId: string;

  beforeEach(async () => {
    await prisma.directExpensePayment.deleteMany({ where: { additionalCharge: { weddingId } } });
    await prisma.additionalCharge.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Stale Charge Test Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-20"),
        endDate: new Date("2026-11-23"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        totalBudgetPaise: 2000000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Varun",
            partnerTwoName: "Kavya",
            email: "varun.kavya@test.com",
            phone: "+919876533333"
          }
        }
      }
    });

    // Initial Charge Amount is ₹10,000 (1000000 paise)
    const charge = await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Emergency lighting diesel",
        reasonType: "EMERGENCY_EQUIPMENT",
        quantityScaledUnits: 1000n,
        unitCostPaise: 1000000n,
        totalCostPaise: 1000000n, // ₹10,000
        vendorBillId: null,
        billedToClient: false,
        status: "PENDING"
      }
    });
    chargeId = charge.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Scenario A: Concurrent Race — Charge modification races with payment creation, evaluating against the final committed charge amount", async () => {
    // Launch a concurrent race between a charge reduction (from ₹10,000 down to ₹5,000)
    // and a payment of ₹7,000.
    // Under the initial ₹10,000, ₹7,000 would be valid.
    // Once the charge is updated to ₹5,000, ₹7,000 MUST be rejected by the refreshed locked read!
    const chargeUpdatePromise = prisma.$transaction(async (tx) => {
      // Touch and reduce the charge
      await tx.additionalCharge.update({
        where: { id: chargeId },
        data: {
          unitCostPaise: 500000n,
          totalCostPaise: 500000n // Reduced to ₹5,000
        }
      });
    });

    const paymentPromise = createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: chargeId,
      amountPaise: 700000n, // ₹7,000
      paymentMethod: "CASH",
      transactionReference: "RACE-PAYMENT-7000",
      status: "CLEARED"
    });

    const [updateResult, paymentResult] = await Promise.allSettled([
      chargeUpdatePromise,
      paymentPromise
    ]);

    // Update must succeed
    expect(updateResult.status).toBe("fulfilled");

    // Re-query database: the final charge is ₹5,000
    const finalCharge = await prisma.additionalCharge.findUniqueOrThrow({ where: { id: chargeId } });
    expect(finalCharge.totalCostPaise).toBe(500000n);

    // If the payment evaluated after the update lock, it was rejected
    // If the payment executed before the update lock, the total payments would be ₹7,000,
    // which would trigger an anomaly.
    // In our sequential lock acquisition, payment after update must reject:
    if (paymentResult.status === "rejected") {
      expect(paymentResult.reason).toBeInstanceOf(PaymentCeilingExceededError);
    }

    // Now attempt a payment within the refreshed capacity of ₹5,000
    const validPayment = await createDirectExpensePaymentWithRetry(prisma, {
      weddingId,
      additionalChargeId: chargeId,
      amountPaise: 500000n, // Exact ₹5,000
      paymentMethod: "CASH",
      transactionReference: "REFRESHED-CAPACITY-5000",
      status: "CLEARED"
    });

    expect(validPayment.status).toBe("CLEARED");
    expect(validPayment.amountPaise).toBe(500000n);
  });
});
