import { PrismaClient } from "@prisma/client";
import { SimulateBudgetInput, BudgetSimulationResult } from "shared";

export class BudgetSimulatorService {
  constructor(private prisma: PrismaClient) {}

  async simulateBudget(input: SimulateBudgetInput): Promise<BudgetSimulationResult> {
    const wedding = await this.prisma.wedding.findUnique({
      where: { id: input.weddingId },
      include: {
        quotationRequestGroups: {
          include: {
            awardedQuotation: true
          }
        },
        weddingVendors: {
          include: {
            vendor: true,
            vendorBills: {
              where: { status: { in: ["APPROVED", "PAID"] } }
            }
          }
        },
        clientInvoices: {
          where: { status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] } }
        },
        additionalCharges: true
      }
    });

    if (!wedding) {
      throw new Error(`Wedding with ID "${input.weddingId}" not found`);
    }

    // 1. Establish Baseline Financial Ledger
    const contractedBudgetPaise = wedding.totalBudgetPaise;

    let invoicedRevenuePaise = 0n;
    for (const inv of wedding.clientInvoices) {
      invoicedRevenuePaise += inv.totalAmountPaise;
    }

    let committedExpensesPaise = 0n;
    // Tally vendor bills
    for (const wv of wedding.weddingVendors) {
      for (const bill of wv.vendorBills) {
        committedExpensesPaise += bill.totalBilledPaise;
      }
    }
    // Tally additional direct charges
    for (const chg of wedding.additionalCharges) {
      committedExpensesPaise += chg.totalCostPaise;
    }

    // If no bills exist yet, fall back to contracted vendor baseline amounts for realistic committed projections
    if (committedExpensesPaise === 0n) {
      for (const wv of wedding.weddingVendors) {
        committedExpensesPaise += wv.agreedBaselineAmountPaise;
      }
    }

    const baselineProfitPaise = invoicedRevenuePaise - committedExpensesPaise;
    const baselineMarginPercent =
      invoicedRevenuePaise > 0n
        ? Number((baselineProfitPaise * 10000n) / invoicedRevenuePaise) / 100
        : null;

    // 2. Discover Awarded Quotation Rates
    let cateringPlateRatePaise = 0n;
    let cateringPlateRateStatus: "AWARDED" | "UNAVAILABLE" = "UNAVAILABLE";
    let photographyExtraRatePaise = 0n;
    let soundExtraRatePaise = 0n;

    for (const qrg of wedding.quotationRequestGroups) {
      const awardedQuote = qrg.awardedQuotation;
      if (awardedQuote) {
        if (qrg.category === "CATERING" && awardedQuote.pricePerPlatePaise) {
          cateringPlateRatePaise = awardedQuote.pricePerPlatePaise;
          cateringPlateRateStatus = "AWARDED";
        }
        if (qrg.category === "PHOTOGRAPHY" && awardedQuote.extraHourRatePaise) {
          photographyExtraRatePaise = awardedQuote.extraHourRatePaise;
        }
        if (qrg.category === "SOUND_LIGHT" && awardedQuote.extraHourRatePaise) {
          soundExtraRatePaise = awardedQuote.extraHourRatePaise;
        }
      }
    }

    // 3. Compute Simulated Cost Deltas
    const additionalPlates = BigInt(Math.max(0, input.additionalCateringPlates));
    const cateringExpenseDeltaPaise = cateringPlateRatePaise * additionalPlates;

    const photoHours = BigInt(Math.round(Math.max(0, input.extraPhotographyHours)));
    const photographyExpenseDeltaPaise = photographyExtraRatePaise * photoHours;

    const soundHours = BigInt(Math.round(Math.max(0, input.extraSoundHours)));
    const soundExpenseDeltaPaise = soundExtraRatePaise * soundHours;

    const decorExpenseDeltaPaise = BigInt(input.extraDecorBudgetPaise || "0");

    const totalExpenseDeltaPaise =
      cateringExpenseDeltaPaise +
      photographyExpenseDeltaPaise +
      soundExpenseDeltaPaise +
      decorExpenseDeltaPaise;

    // 4. Agency Markup & Client Billed Delta
    const markupPct = BigInt(Math.min(100, Math.max(0, Math.round(input.agencyMarkupPercent))));
    const agencyMarkupRevenueDeltaPaise = (totalExpenseDeltaPaise * markupPct) / 100n;
    const clientBilledRevenueDeltaPaise = totalExpenseDeltaPaise + agencyMarkupRevenueDeltaPaise;

    // 5. Projected Totals
    const projectedExpensesPaise = committedExpensesPaise + totalExpenseDeltaPaise;
    const projectedRevenuePaise = invoicedRevenuePaise + clientBilledRevenueDeltaPaise;
    const projectedProfitPaise = projectedRevenuePaise - projectedExpensesPaise;

    const projectedMarginPercent =
      projectedRevenuePaise > 0n
        ? Number((projectedProfitPaise * 10000n) / projectedRevenuePaise) / 100
        : null;

    const isDeficit = projectedProfitPaise < 0n;

    return {
      weddingId: wedding.id,
      weddingTitle: wedding.title,
      baseline: {
        contractedBudgetPaise: contractedBudgetPaise.toString(),
        invoicedRevenuePaise: invoicedRevenuePaise.toString(),
        committedExpensesPaise: committedExpensesPaise.toString(),
        baselineProfitPaise: baselineProfitPaise.toString(),
        baselineMarginPercent
      },
      simulationDeltas: {
        guestCountChange: input.deltaGuestCount,
        additionalPlates: input.additionalCateringPlates,
        cateringPlateRatePaise: cateringPlateRatePaise.toString(),
        cateringPlateRateStatus,
        cateringExpenseDeltaPaise: cateringExpenseDeltaPaise.toString(),
        photographyHours: input.extraPhotographyHours,
        photographyExtraRatePaise: photographyExtraRatePaise.toString(),
        photographyExpenseDeltaPaise: photographyExpenseDeltaPaise.toString(),
        soundHours: input.extraSoundHours,
        soundExtraRatePaise: soundExtraRatePaise.toString(),
        soundExpenseDeltaPaise: soundExpenseDeltaPaise.toString(),
        decorExpenseDeltaPaise: decorExpenseDeltaPaise.toString(),
        totalExpenseDeltaPaise: totalExpenseDeltaPaise.toString(),
        agencyMarkupPercent: input.agencyMarkupPercent,
        agencyMarkupRevenueDeltaPaise: agencyMarkupRevenueDeltaPaise.toString(),
        clientBilledRevenueDeltaPaise: clientBilledRevenueDeltaPaise.toString()
      },
      projectedTotals: {
        projectedExpensesPaise: projectedExpensesPaise.toString(),
        projectedRevenuePaise: projectedRevenuePaise.toString(),
        projectedProfitPaise: projectedProfitPaise.toString(),
        projectedMarginPercent,
        isDeficit
      }
    };
  }
}
