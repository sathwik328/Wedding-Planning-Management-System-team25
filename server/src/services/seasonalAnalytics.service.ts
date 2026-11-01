import { PrismaClient } from "@prisma/client";
import { computeAuthoritativeWeddingLedger, AuthoritativeLedgerReport } from "./financialLedger.service.js";

export interface WeddingFinancialSummary {
  weddingId: string;
  weddingTitle: string;
  packageType: string;
  primaryCity: string;
  venueName: string;
  targetGuestCount: number;
  totalBudgetPaise: string;
  ledger: AuthoritativeLedgerReport;
}

export interface SeasonalFinancialAnalytics {
  seasonOverview: {
    totalWeddings: number;
    completedWeddings: number;
    activeWeddings: number;
    planningWeddings: number;
    totalTargetGuests: number;
    averageGuestCount: number;
    totalBudgetPaise: string;
    averageBudgetPaise: string;
  };
  portfolioLedger: {
    accrual: {
      totalInvoicedRevenuePaise: string;
      totalVendorExpensesPaise: string;
      totalDirectExpensesPaise: string;
      totalLaborCostPaise: string;
      totalOperatingProfitPaise: string;
      operatingProfitMarginPercent: number;
    };
    cashFlow: {
      totalClearedInflowsPaise: string;
      totalClearedOutflowsPaise: string;
      totalClearedDirectExpensesPaise: string;
      netCashPositionPaise: string;
    };
    workingCapital: {
      totalOutstandingReceivablesPaise: string;
      totalUnpaidVendorLiabilitiesPaise: string;
      totalUnpaidDirectExpensesPaise: string;
    };
  };
  marginByPackageType: {
    fullService: {
      count: number;
      invoicedRevenuePaise: string;
      operatingProfitPaise: string;
      marginPercent: number;
    };
    partialService: {
      count: number;
      invoicedRevenuePaise: string;
      operatingProfitPaise: string;
      marginPercent: number;
    };
  };
  auditAnomaliesTotal: number;
  weddings: WeddingFinancialSummary[];
}

export class SeasonalAnalyticsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSeasonalFinancialAnalytics(): Promise<SeasonalFinancialAnalytics> {
    const weddings = await this.prisma.wedding.findMany({
      orderBy: { startDate: "asc" }
    });

    const weddingSummaries: WeddingFinancialSummary[] = [];

    let totalBudgetBig = 0n;
    let totalTargetGuests = 0;
    let completedCount = 0;
    let activeCount = 0;
    let planningCount = 0;

    let portInvoicedRevBig = 0n;
    let portVendorExpBig = 0n;
    let portDirectExpBig = 0n;
    let portLaborBig = 0n;
    let portProfitBig = 0n;

    let portCashInflowsBig = 0n;
    let portCashOutflowsBig = 0n;
    let portCashDirectBig = 0n;
    let portNetCashBig = 0n;

    let portReceivablesBig = 0n;
    let portVendorLiabilitiesBig = 0n;
    let portDirectLiabilitiesBig = 0n;

    let fullServiceCount = 0;
    let fullServiceRevBig = 0n;
    let fullServiceProfitBig = 0n;

    let partialServiceCount = 0;
    let partialServiceRevBig = 0n;
    let partialServiceProfitBig = 0n;

    let totalAnomalies = 0;

    for (const w of weddings) {
      totalBudgetBig += w.totalBudgetPaise;
      totalTargetGuests += w.targetGuestCount;

      if (w.status === "COMPLETED" || w.status === "SETTLED") {
        completedCount++;
      } else if (w.status === "ACTIVE_EXECUTION") {
        activeCount++;
      } else {
        planningCount++;
      }

      // Compute individual authoritative ledger
      const ledger = await computeAuthoritativeWeddingLedger(this.prisma, w.id);

      const revBig = BigInt(ledger.accrual.invoicedClientRevenuePaise);
      const vendExpBig = BigInt(ledger.accrual.recognizedVendorExpensesPaise);
      const dirExpBig = BigInt(ledger.accrual.directAgencyExpensesPaise);
      const laborBig = BigInt(ledger.accrual.internalLaborCostsPaise);
      const profitBig = BigInt(ledger.accrual.operatingProfitPaise);

      portInvoicedRevBig += revBig;
      portVendorExpBig += vendExpBig;
      portDirectExpBig += dirExpBig;
      portLaborBig += laborBig;
      portProfitBig += profitBig;

      portCashInflowsBig += BigInt(ledger.cashFlow.clearedClientInflowsPaise);
      portCashOutflowsBig += BigInt(ledger.cashFlow.clearedVendorOutflowsPaise);
      portCashDirectBig += BigInt(ledger.cashFlow.clearedDirectExpensesPaise);
      portNetCashBig += BigInt(ledger.cashFlow.netActualCashFlowPaise);

      portReceivablesBig += BigInt(ledger.workingCapital.outstandingClientReceivablesPaise);
      portVendorLiabilitiesBig += BigInt(ledger.workingCapital.unpaidVendorLiabilitiesPaise);
      portDirectLiabilitiesBig += BigInt(ledger.workingCapital.unpaidDirectExpensesPaise);

      totalAnomalies += ledger.auditAnomalies.length;

      if (w.packageType === "FULL_SERVICE") {
        fullServiceCount++;
        fullServiceRevBig += revBig;
        fullServiceProfitBig += profitBig;
      } else {
        partialServiceCount++;
        partialServiceRevBig += revBig;
        partialServiceProfitBig += profitBig;
      }

      weddingSummaries.push({
        weddingId: w.id,
        weddingTitle: w.title,
        packageType: w.packageType,
        primaryCity: w.primaryCity,
        venueName: w.venueName,
        targetGuestCount: w.targetGuestCount,
        totalBudgetPaise: w.totalBudgetPaise.toString(),
        ledger
      });
    }

    const totalCount = weddings.length;
    const avgGuests = totalCount > 0 ? Math.round(totalTargetGuests / totalCount) : 0;
    const avgBudgetBig = totalCount > 0 ? totalBudgetBig / BigInt(totalCount) : 0n;

    const overallMarginPercent =
      portInvoicedRevBig > 0n
        ? Number((portProfitBig * 10000n) / portInvoicedRevBig) / 100
        : 0;

    const fullServiceMarginPercent =
      fullServiceRevBig > 0n
        ? Number((fullServiceProfitBig * 10000n) / fullServiceRevBig) / 100
        : 0;

    const partialServiceMarginPercent =
      partialServiceRevBig > 0n
        ? Number((partialServiceProfitBig * 10000n) / partialServiceRevBig) / 100
        : 0;

    return {
      seasonOverview: {
        totalWeddings: totalCount,
        completedWeddings: completedCount,
        activeWeddings: activeCount,
        planningWeddings: planningCount,
        totalTargetGuests,
        averageGuestCount: avgGuests,
        totalBudgetPaise: totalBudgetBig.toString(),
        averageBudgetPaise: avgBudgetBig.toString()
      },
      portfolioLedger: {
        accrual: {
          totalInvoicedRevenuePaise: portInvoicedRevBig.toString(),
          totalVendorExpensesPaise: portVendorExpBig.toString(),
          totalDirectExpensesPaise: portDirectExpBig.toString(),
          totalLaborCostPaise: portLaborBig.toString(),
          totalOperatingProfitPaise: portProfitBig.toString(),
          operatingProfitMarginPercent: overallMarginPercent
        },
        cashFlow: {
          totalClearedInflowsPaise: portCashInflowsBig.toString(),
          totalClearedOutflowsPaise: portCashOutflowsBig.toString(),
          totalClearedDirectExpensesPaise: portCashDirectBig.toString(),
          netCashPositionPaise: portNetCashBig.toString()
        },
        workingCapital: {
          totalOutstandingReceivablesPaise: portReceivablesBig.toString(),
          totalUnpaidVendorLiabilitiesPaise: portVendorLiabilitiesBig.toString(),
          totalUnpaidDirectExpensesPaise: portDirectLiabilitiesBig.toString()
        }
      },
      marginByPackageType: {
        fullService: {
          count: fullServiceCount,
          invoicedRevenuePaise: fullServiceRevBig.toString(),
          operatingProfitPaise: fullServiceProfitBig.toString(),
          marginPercent: fullServiceMarginPercent
        },
        partialService: {
          count: partialServiceCount,
          invoicedRevenuePaise: partialServiceRevBig.toString(),
          operatingProfitPaise: partialServiceProfitBig.toString(),
          marginPercent: partialServiceMarginPercent
        }
      },
      auditAnomaliesTotal: totalAnomalies,
      weddings: weddingSummaries
    };
  }
}
