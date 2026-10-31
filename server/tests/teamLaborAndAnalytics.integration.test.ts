import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { TeamLaborService } from "../src/services/teamLabor.service.js";
import { SeasonalAnalyticsService } from "../src/services/seasonalAnalytics.service.js";

const prisma = new PrismaClient();
const laborService = new TeamLaborService(prisma);
const analyticsService = new SeasonalAnalyticsService(prisma);

describe("Team Labor & Seasonal Financial Analytics Integration Tests", () => {
  const weddingId = "int-test-labor-wedding-uuid";
  const coupleId = "int-test-labor-couple-uuid";
  let userId: string;

  beforeEach(async () => {
    await prisma.teamWorkLog.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });
    await prisma.couple.deleteMany({ where: { id: coupleId } });

    await prisma.couple.create({
      data: {
        id: coupleId,
        partnerOneName: "Shaurya Maroo",
        partnerTwoName: "Vidhi Kankaria",
        email: "shaurya.vidhi@test.in",
        phone: "+919829999040"
      }
    });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        coupleId,
        title: "The Royal Wedding of Shaurya & Vidhi",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-15T10:00:00Z"),
        endDate: new Date("2026-11-18T18:00:00Z"),
        primaryCity: "Jaipur",
        venueName: "Fairmont Palace",
        targetGuestCount: 420,
        totalBudgetPaise: 2500000000n, // ₹2.5 Crores
        status: "PLANNING"
      }
    });

    const user = await prisma.user.upsert({
      where: { email: "lead.planner.test@royalknot.in" },
      update: {},
      create: {
        id: "test-user-lead-planner",
        name: "Ananya Singhal",
        email: "lead.planner.test@royalknot.in",
        role: "LEAD_PLANNER",
        hourlyRatePaise: 250000n // ₹2,500/hr
      }
    });
    userId = user.id;
  });

  it("calculates team labor with exact integer hourly rates and runs seasonal analytics", async () => {
    // 1. Record 8.5 hours of planning labor at ₹2,500/hr
    // 8.5 * ₹2,500 = ₹21,250 (2125000 paise)
    const log1 = await laborService.recordWorkLog({
      weddingId,
      userId,
      date: new Date("2026-10-10T09:00:00Z"),
      hoursWorked: 8.5,
      taskDescription: "Venue architectural walkthrough & sound limiters review at Fairmont Palace"
    });

    expect(log1).toBeDefined();
    expect(log1.hoursWorked).toBe(8.5);
    expect(log1.hourlyRatePaise).toBe(250000n);
    expect(log1.totalLaborCostPaise).toBe(2125000n); // ₹21,250

    // 2. Record 4.0 hours of logistics coordination
    // 4.0 * ₹2,500 = ₹10,000 (1000000 paise)
    const log2 = await laborService.recordWorkLog({
      weddingId,
      userId,
      date: new Date("2026-10-11T14:00:00Z"),
      hoursWorked: 4.0,
      taskDescription: "Vendor arrival schedules and hospitality transport sync"
    });

    expect(log2.totalLaborCostPaise).toBe(1000000n);

    // 3. Verify Wedding Labor Summary
    const summary = await laborService.getWeddingLaborSummary(weddingId);
    expect(summary.totalHours).toBe(12.5);
    expect(summary.totalLaborCostPaise).toBe("3125000"); // ₹31,250
    expect(summary.logCount).toBe(2);

    // 4. Execute Seasonal Financial Analytics
    const seasonal = await analyticsService.getSeasonalFinancialAnalytics();
    expect(seasonal.seasonOverview.totalWeddings).toBeGreaterThanOrEqual(1);
    expect(seasonal.portfolioLedger.accrual.totalLaborCostPaise).toBeDefined();
    expect(seasonal.marginByPackageType.fullService).toBeDefined();
    expect(seasonal.marginByPackageType.partialService).toBeDefined();
  });
});
