import { z } from "zod";

export interface ComponentBreakdown {
  earnedPoints: number;
  maxPoints: number;
  available: boolean;
  metricLabel: string;
  metricValueText: string;
}

export interface VendorReliabilityScorecard {
  vendorId: string;
  businessName: string;
  category: string;
  city: string;
  ratingStatus: "RATED" | "UNRATED_EMERGING_PARTNER";
  scoreType: "FULLY_ASSESSED" | "PRELIMINARY_NORMALIZED" | "INSUFFICIENT_DATA";
  reliabilityIndex: number | null; // 0–100 or null if unrated
  evidenceCoverage: {
    coveragePercent: number; // 0–100%
    availableComponents: string[];
    missingComponents: string[];
    isStatisticallyConfident: boolean;
  };
  components: {
    punctuality: ComponentBreakdown;
    costFidelity: ComponentBreakdown;
    incidentStability: ComponentBreakdown;
  };
  metrics: {
    completedWeddingsCount: number;
    scheduledCheckInsCount: number;
    onTimeCheckInsCount: number;
    totalAgreedBaselinePaise: string;
    totalReconciledBilledPaise: string;
    costVariancePercent: number | null;
    attributedIncidentsCount: number;
  };
}
