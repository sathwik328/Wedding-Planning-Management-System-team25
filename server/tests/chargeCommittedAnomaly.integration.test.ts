import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computeAuthoritativeWeddingLedger } from "../src/services/financialLedger.service.js";

const prisma = new PrismaClient();

describe("Sixth Ledger Anomaly Integration Test: CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST", () => {
  const weddingId = "int-test-anomaly-six-wedding-uuid";

  beforeEach(async () => {
    await prisma.directExpensePayment.deleteMany({ where: { additionalCharge: { weddingId } } });
    await prisma.additionalCharge.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Anomaly Six Test Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-20"),
        endDate: new Date("2026-11-23"),
        primaryCity: "Jaipur",
        venueName: "City Palace",
        totalBudgetPaise: 2000000000n,
        status: "PLANNING",
        couple: {
          create: {
            partnerOneName: "Kabir",
            partnerTwoName: "Nisha",
            email: "kabir.nisha@test.com",
            phone: "+919876522221"
          }
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Detects CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST when pending payments cause over-commitment, without altering cash outflows", async () => {
    // 1. Create a direct AdditionalCharge of ₹10,000 (1000000 paise)
    const charge = await prisma.additionalCharge.create({
      data: {
        weddingId,
        description: "Emergency ice blocks for banquet",
        reasonType: "MISC",
        quantityScaledUnits: 1000n,
        unitCostPaise: 1000000n,
        totalCostPaise: 1000000n, // ₹10,000
        vendorBillId: null,      // Direct agency charge
        billedToClient: false,
        status: "PENDING"
      }
    });

    // 2. Create a CLEARED payment of ₹6,000 (600000 paise)
    // Note: ₹6,000 is LESS than the ₹10,000 charge, so cleared payments DO NOT exceed total cost.
    await prisma.directExpensePayment.create({
      data: {
        additionalChargeId: charge.id,
        amountPaise: 600000n, // ₹6,000
        paymentMethod: "CASH",
        transactionReference: "CLEARED-ICE-001",
        status: "CLEARED",
        clearedAt: new Date()
      }
    });

    // 3. Create a PENDING payment of ₹6,000 (600000 paise)
    // Combined committed payments = ₹6,000 + ₹6,000 = ₹12,000 (Exceeds ₹10,000 total by ₹2,000!)
    await prisma.directExpensePayment.create({
      data: {
        additionalChargeId: charge.id,
        amountPaise: 600000n, // ₹6,000
        paymentMethod: "COMPANY_CARD",
        transactionReference: "PENDING-ICE-002",
        status: "PENDING"
      }
    });

    // 4. Compute the Authoritative Ledger
    const report = await computeAuthoritativeWeddingLedger(prisma, weddingId);

    // --- VERIFICATIONS ---

    // A. Verify that raw financial figures remain unsuppressed and unadjusted
    // Accrual direct expense is strictly the recorded totalCostPaise: ₹10,000
    expect(report.accrual.directAgencyExpensesPaise).toBe("1000000");

    // B. Verify Cash Flow: Cleared direct expenses is STRICTLY ₹6,000
    // The pending ₹6,000 MUST NOT be included in cash outflows!
    expect(report.cashFlow.clearedDirectExpensesPaise).toBe("600000");

    // C. Verify Working Capital pending payments records strictly ₹6,000
    expect(report.workingCapital.pendingDirectPaymentsPaise).toBe("600000");

    // D. Anomaly Reporting Assertions:
    const anomalyCodes = report.auditAnomalies.map((a) => a.code);

    // MUST contain CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST
    expect(anomalyCodes).toContain("CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST");

    // MUST NOT contain CHARGE_CLEARED_PAYMENTS_EXCEED_TOTAL_COST (cleared is only ₹6,000 <= ₹10,000)
    expect(anomalyCodes).not.toContain("CHARGE_CLEARED_PAYMENTS_EXCEED_TOTAL_COST");

    // E. Verify Discrepancy Payload
    const committedAnomaly = report.auditAnomalies.find(
      (a) => a.code === "CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST"
    );

    expect(committedAnomaly).toBeDefined();
    expect(committedAnomaly?.severity).toBe("WARNING");
    expect(committedAnomaly?.targetAmountPaise).toBe("1000000"); // ₹10,000 target
    expect(committedAnomaly?.clearedOrCommittedAmountPaise).toBe("1200000"); // ₹12,000 committed
    // Discrepancy = ₹12,000 - ₹10,000 = ₹2,000 (200000 paise)
    expect(committedAnomaly?.discrepancyPaise).toBe("200000");
    expect(committedAnomaly?.explanation).toContain("exceed total cost by ₹2000");
  });
});
