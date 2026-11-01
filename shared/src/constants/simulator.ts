import { z } from "zod";

export const SimulateBudgetSchema = z.object({
  weddingId: z.string().uuid("Invalid wedding ID"),
  deltaGuestCount: z.number().int().default(0),
  additionalCateringPlates: z.number().int().min(0).default(0),
  extraPhotographyHours: z.number().min(0).default(0),
  extraSoundHours: z.number().min(0).default(0),
  extraDecorBudgetPaise: z.string().regex(/^\d+$/).default("0"),
  agencyMarkupPercent: z.number().min(0).max(100).default(0) // Default: 0% exact cost pass-through
});

export type SimulateBudgetInput = z.infer<typeof SimulateBudgetSchema>;

export interface BudgetSimulationResult {
  weddingId: string;
  weddingTitle: string;
  baseline: {
    contractedBudgetPaise: string;
    invoicedRevenuePaise: string;
    committedExpensesPaise: string;
    baselineProfitPaise: string;
    baselineMarginPercent: number | null;
  };
  simulationDeltas: {
    guestCountChange: number;
    additionalPlates: number;
    cateringPlateRatePaise: string;
    cateringPlateRateStatus: "AWARDED" | "UNAVAILABLE";
    cateringExpenseDeltaPaise: string;
    photographyHours: number;
    photographyExtraRatePaise: string;
    photographyExpenseDeltaPaise: string;
    soundHours: number;
    soundExtraRatePaise: string;
    soundExpenseDeltaPaise: string;
    decorExpenseDeltaPaise: string;
    totalExpenseDeltaPaise: string;
    agencyMarkupPercent: number;
    agencyMarkupRevenueDeltaPaise: string;
    clientBilledRevenueDeltaPaise: string;
  };
  projectedTotals: {
    projectedExpensesPaise: string;
    projectedRevenuePaise: string;
    projectedProfitPaise: string;
    projectedMarginPercent: number | null;
    isDeficit: boolean;
  };
}
